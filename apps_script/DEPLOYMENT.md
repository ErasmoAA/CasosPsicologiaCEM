# Apps Script Deployment

This folder contains a Google Apps Script project that acts as the backend for the frontend in this repository.

## Initial Setup
1. Create a new **Standalone** Apps Script project and copy the contents of `Code.gs` and `appsscript.json` into it.
2. Open **Project Settings** → **Script Properties** and add:
   - `FCM_SERVER_KEY`: the server key from your Firebase Cloud Messaging project.

## Web App
1. Select **Deploy → Test deployments → Web app**.
2. Set *Execute as* to **Me** and *Who has access* to **Anyone**.
3. Deploy and note the Web App URL for use by the frontend. The web app exposes:
   - `POST action=register` to store device tokens.
   - `POST action=notify` to dispatch push notifications.

## Gmail Polling Trigger
1. In the editor select **Triggers → Add Trigger**.
2. Choose the `checkInbox` function.
3. Set the event source to **Time-driven** and schedule it (e.g. every 5 minutes).

## Document Generation
Use `generateFromTemplate(templateId, data)` to create Google Docs from Drive templates. Replace `{{placeholders}}` in the template with properties from `data`.

## Updating the FCM Server Key
If the FCM server key changes, update the `FCM_SERVER_KEY` script property. The code reads the property for every request.
