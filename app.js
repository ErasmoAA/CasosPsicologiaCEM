// Firebase configuration
const firebaseConfig = {
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'YOUR_FIREBASE_AUTH_DOMAIN',
  projectId: 'YOUR_FIREBASE_PROJECT_ID',
  storageBucket: 'YOUR_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'YOUR_FIREBASE_APP_ID'
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const messaging = firebase.messaging();

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.register('firebase-messaging-sw.js');
    messaging.useServiceWorker(registration);
    console.log('Service worker registered');
  }
}

registerServiceWorker();

async function initMessaging() {
  try {
    await Notification.requestPermission();
    const token = await messaging.getToken({ vapidKey: 'YOUR_VAPID_KEY' });
    console.log('FCM token', token);
    if (auth.currentUser) {
      await db
        .collection('users')
        .doc(auth.currentUser.uid)
        .set({ fcmToken: token }, { merge: true });
    }
  } catch (err) {
    console.error('Unable to init messaging', err);
  }
}

messaging.onMessage((payload) => {
  console.log('Message received', payload);
  const { title, body } = payload.notification;
  new Notification(title, { body });
});

async function handleAuth() {
  const googleUser = await gapi.auth2.getAuthInstance().signIn();
  const idToken = googleUser.getAuthResponse().id_token;
  const accessToken = googleUser.getAuthResponse().access_token;

  await auth.signInWithCredential(
    firebase.auth.GoogleAuthProvider.credential(idToken)
  );
  gapi.client.setToken({ access_token: accessToken });
  document.getElementById('status').textContent =
    'Signed in as ' + auth.currentUser.displayName;
  await initMessaging();
  startEmailPolling();
}

function initGapi() {
  gapi.load('client:auth2', async () => {
    await gapi.client.init({
      apiKey: 'YOUR_GOOGLE_API_KEY',
      clientId: 'YOUR_GOOGLE_CLIENT_ID',
      discoveryDocs: [
        'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'
      ],
      scope:
        'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send'
    });
    document.getElementById('sign-in').onclick = handleAuth;
  });
}

initGapi();

document
  .getElementById('case-form')
  .addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      clientName: document.getElementById('clientName').value,
      clientEmail: document.getElementById('clientEmail').value,
      description: document.getElementById('caseDescription').value,
      template: document.getElementById('template').value
    };
    await registerCase(data);
    e.target.reset();
  });

async function registerCase(data) {
  const docRef = await db.collection('cases').add({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    userId: auth.currentUser ? auth.currentUser.uid : null
  });
  const pdf = await generateCasePDF(data);
  await sendEmail(
    data.clientEmail,
    'Caso registrado',
    'Se ha registrado su caso.',
    pdf
  );
  showNotification('Case registered: ' + docRef.id);
}

function showNotification(text) {
  if (Notification.permission === 'granted') {
    new Notification('Casos Psicologia CEM', { body: text });
  }
  document.getElementById('status').textContent = text;
}

async function generateCasePDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text(`Case for ${data.clientName}`, 10, 10);
  doc.text(`Description: ${data.description}`, 10, 20);
  return doc.output('blob');
}

async function sendEmail(to, subject, body, pdfBlob) {
  const pdfBase64 = await blobToBase64(pdfBlob);
  const boundary = 'boundary123';
  const message =
    `Content-Type: multipart/mixed; boundary="${boundary}"\r\n` +
    'MIME-Version: 1.0\r\n' +
    `to: ${to}\r\n` +
    `subject: ${subject}\r\n\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: text/plain; charset="UTF-8"\r\n\r\n' +
    `${body}\r\n\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/pdf; name="case.pdf"\r\n' +
    'Content-Transfer-Encoding: base64\r\n' +
    'Content-Disposition: attachment; filename="case.pdf"\r\n\r\n' +
    `${pdfBase64}\r\n` +
    `--${boundary}--`;

  const encodedMessage = btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  await gapi.client.gmail.users.messages.send({
    userId: 'me',
    resource: { raw: encodedMessage }
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result.split(',')[1];
      resolve(data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function decodeMessagePayload(payload) {
  let body = '';
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body.data) {
        body += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
    }
  } else if (payload.body && payload.body.data) {
    body += atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
  }
  return body;
}

async function checkEmail() {
  const res = await gapi.client.gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread'
  });
  if (res.result.messages) {
    for (const msg of res.result.messages) {
      const full = await gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      });
      const body = decodeMessagePayload(full.result.payload);
      const caseData = parseEmailForCase(body);
      if (caseData) {
        await registerCase(caseData);
      }
      await gapi.client.gmail.users.messages.modify({
        userId: 'me',
        id: msg.id,
        removeLabelIds: ['UNREAD']
      });
    }
  }
}

function parseEmailForCase(body) {
  const lines = body.split('\n');
  const data = {};
  for (const line of lines) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      data[key.trim()] = rest.join(':').trim();
    }
  }
  if (data.clientName && data.clientEmail) {
    return {
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      description: data.description || ''
    };
  }
  return null;
}

function startEmailPolling() {
  checkEmail();
  setInterval(checkEmail, 60000);
}

