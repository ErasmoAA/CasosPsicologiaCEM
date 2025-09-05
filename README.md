# CasosPsicologiaCEM

Static frontend for monitoring Gmail and registering psychology cases in Firestore.

## Development

1. Provide your Firebase and Google API credentials in `app.js` and `firebase-messaging-sw.js`.
2. Serve the project root (for example with `npx serve`).
3. Open the site and sign in with Google to allow Gmail access.

The app polls Gmail for new messages, stores case information in Firestore, generates PDFs, sends confirmation emails, and delivers push notifications via Firebase Cloud Messaging.
