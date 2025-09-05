// Google Apps Script backend for CasosPsicologiaCEM
// Exposes endpoints for token registration, push notifications,
// Gmail polling, and document generation from templates.

/**
 * Registers FCM tokens and dispatches notifications.
 * @param {GoogleAppsScript.Events.DoPost} e POST request event
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  var data = {};
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    // ignore
  }
  var action = (data.action || e.parameter.action || '').toLowerCase();
  if (action === 'register') {
    return registerToken_(data.token);
  }
  if (action === 'notify') {
    return pushNotification_(data.message, data.payload);
  }
  return ContentService.createTextOutput('Invalid request');
}

// Stores a unique device token in ScriptProperties.
function registerToken_(token) {
  if (!token) {
    return ContentService.createTextOutput('Missing token');
  }
  var props = PropertiesService.getScriptProperties();
  var tokens = JSON.parse(props.getProperty('TOKENS') || '[]');
  if (tokens.indexOf(token) === -1) {
    tokens.push(token);
    props.setProperty('TOKENS', JSON.stringify(tokens));
  }
  return ContentService.createTextOutput('ok');
}

// Sends a push notification to all registered tokens.
function pushNotification_(message, payload) {
  var tokens = getTokens_();
  tokens.forEach(function(t) {
    sendFcm_(t, message, payload);
  });
  return ContentService.createTextOutput('sent');
}

// Retrieves stored tokens.
function getTokens_() {
  var props = PropertiesService.getScriptProperties();
  return JSON.parse(props.getProperty('TOKENS') || '[]');
}

// Dispatches a push notification via Firebase Cloud Messaging.
function sendFcm_(token, message, payload) {
  var key = PropertiesService.getScriptProperties().getProperty('FCM_SERVER_KEY');
  if (!key) {
    throw new Error('FCM_SERVER_KEY not set.');
  }
  var url = 'https://fcm.googleapis.com/fcm/send';
  var body = {
    to: token,
    notification: {
      title: 'Casos Psicologia',
      body: message || ''
    },
    data: payload || {}
  };
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(body),
    headers: { Authorization: 'key=' + key }
  };
  UrlFetchApp.fetch(url, options);
}

// Polls Gmail for unread messages and marks them as read.
function checkInbox() {
  var threads = GmailApp.search('label:inbox is:unread');
  threads.forEach(function(thread) {
    var messages = thread.getMessages();
    messages.forEach(function(msg) {
      // TODO: Process the message contents.
    });
    thread.markRead();
  });
}

// Generates a document from a Drive template using {{placeholders}}.
function generateFromTemplate(templateId, data) {
  var template = DriveApp.getFileById(templateId);
  var copy = template.makeCopy('Generated ' + new Date().toISOString());
  var doc = DocumentApp.openById(copy.getId());
  var body = doc.getBody();
  Object.keys(data || {}).forEach(function(key) {
    body.replaceText('{{' + key + '}}', data[key]);
  });
  doc.saveAndClose();
  return copy.getId();
}

// Creates a 5‑minute time-based trigger for checkInbox().
function createTimeTrigger() {
  ScriptApp.newTrigger('checkInbox')
    .timeBased()
    .everyMinutes(5)
    .create();
}
