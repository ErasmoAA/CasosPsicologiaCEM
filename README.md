# CasosPsicologiaCEM

Static frontend for monitoring Gmail and registering psychology cases in Firestore.

## Objectives
* Poll Gmail for new messages.
* Store case information in Firestore.
* Generate PDFs, send confirmation emails, and deliver push notifications via Firebase Cloud Messaging.

## Prerequisites
* A **Firebase project** with Firestore and Cloud Messaging enabled.
* **Google Cloud OAuth credentials** with the Gmail API enabled.
* Deployment of the Apps Script found in `apps_script/`.

## Setup

### Local
1. Clone this repository.
2. Insert your Firebase config and OAuth client information into `app.js` and `firebase-messaging-sw.js`.
3. Deploy the Apps Script and authorize it to access Gmail.
4. Serve the project root, for example with `npx serve`.
5. Visit the site and sign in with Google to grant Gmail access.

### Static hosting
1. Configure `app.js` and `firebase-messaging-sw.js` as above.
2. Upload the repository contents to a static host such as Firebase Hosting or GitHub Pages.
3. Ensure `firebase-messaging-sw.js` is served from the site root.
4. Open the hosted site and sign in with Google.

