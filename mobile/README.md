# EKYAN Connect mobile

The Expo app is the phone-first agripreneur client for the synthetic Busia poultry pilot. It has four main tabs:

- **Today** — open needs, input requests and the next actions.
- **Follow up** — response owner and due date for blockers; update status and record proxy confirmation; confirm receipt for supplier-committed orders.
- **Record** — capture an input request, blocker or practice intention.
- **Business** — keep simple business records.

## Run on a phone

Start the API from `src` and bind it to the local network so a physical phone can reach it:

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000
```

For physical phones, the app detects the computer's LAN address from Expo automatically. If detection is unavailable (or you use a tunnel/custom API host), set `EXPO_PUBLIC_API_URL` explicitly before starting Expo from `mobile`:

```powershell
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.20:8000"
npx expo start
```

Replace the example address with the computer's LAN IP. The phone and computer need to be on the same network. Expo Go can open the development build from the QR code. Use an HTTPS API URL for a deployed app.

## Offline behavior

Unsent field entries and follow-up changes are stored in the phone's local queue with a client reference, then synced through the authenticated synthetic API. Follow-up lists are cached for offline review. When the server status has changed since a queued update was recorded, the API rejects the stale update and the app lets the user remove it and review the current record.

Sign in or create an agripreneur account in the app. Local prototype sign-ups require a name beginning `Synthetic` or `Demo`, an `.invalid` email address, and a password of at least 12 characters. Mobile sessions are kept in SecureStore on iOS/Android; the web preview uses local browser storage. The app accepts synthetic programme records only. Do not enter real participant, farm-location or financial information before privacy and partner agreements are approved. The mobile project has not been configured for store signing or release distribution.

Authentication screens use locally bundled Kenyan farm photos, so they work offline. Photo creators and license details are in [`assets/images/ATTRIBUTION.md`](./assets/images/ATTRIBUTION.md) and in the app’s Terms & Conditions.
