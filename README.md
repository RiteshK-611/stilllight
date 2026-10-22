# Stilllight

A native-first Expo / React Native private beta for photo relighting. Working name; not trademark-cleared. Built independently with Boothie's **workflow** as a functional reference, not its branding, code, screens, or assets.

## Start here

Requires **Node.js 24+** and npm. From this folder:

```powershell
npm run setup
npm run dev
```

- Web preview: **http://localhost:8081**
- API health: **http://localhost:3001/api/health**
- Expo Go: scan the QR code printed by Expo. Install a version compatible with **Expo SDK 58**.
- To start without automatically opening web: `npm run dev:native`.
- If running services separately: `npm run server` and `npm start` in two terminals.

`npm run dev` starts a real API and the Expo app. It does **not** enable paid AI, purchases, hosting, or cloud builds. No API key is needed in demo mode.

The web companion uses single-page output, not unnecessary server-side rendering; all photo API requests go to the separate Node server. If Metro has stale module IDs after changing packages, restart with `npm run dev -- --clear`.

### Your first edit

1. Open the preview and choose **Try the sample photo**, or select your own image.
2. Pick Golden hour, After hours, or Soft studio.
3. Confirm the processing consent and create an edit.
4. Drag the before/after divider, or use Original / Compare / Edited.
5. Save/download, share, favorite, and reopen from Collection.

Demo effects are actual color/exposure transformations made by Sharp. They are **not generative AI relighting** and are labeled DEMO throughout the UI and in saved metadata.

## Phone setup

The app tries to discover the PC's LAN address from the Expo development server. If needed, enter `http://YOUR_PC_LAN_IP:3001` in **Settings → API server address**. Use the address printed by `ipconfig` for the active network adapter. Your phone and PC must be on the same trusted network; localhost on your phone refers to the phone, not the PC. The firewall must allow the API and Metro ports on that private network.

You can also copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`, then restart Expo. **Never put API keys or invite codes in EXPO_PUBLIC_* variables.**

For browser previews on a LAN address, explicitly include that browser origin in `server/.env`'s `ALLOWED_ORIGINS`. Use localhost or HTTPS for web preview; browser WebCrypto and sharing have secure-origin restrictions.

## Turn on real Gemini editing — optional, paid

Do this only after approving a spending budget and reviewing Google's API data/privacy terms:

1. Copy `server/.env.example` to `server/.env`.
2. Set `AI_MODE=gemini`.
3. Add `GEMINI_API_KEY` **only in this server file**.
4. Set a strong `PILOT_INVITE_CODE` of at least 12 characters.
5. The documented default model is `gemini-2.5-flash-image`; use `GEMINI_IMAGE_MODEL` to select another image-editing model enabled for your account.
6. Configure provider-side quotas/billing alerts. The server's `MAX_DAILY_GENERATIONS` caps attempts, **not dollars**. Do not rely on alerts alone as a hard spend cap.
7. Restart the API. Enter the pilot code in the app's Settings and connect.
8. Upload a photo you own. Bundled stock samples are restricted to demo mode in the client.

The real adapter uses Google's official **@google/genai 2.30.0** SDK. It keeps keys and prompts on the API server, requests image output, checks the response, and normalizes the result. It has not been quality-benchmarked using a live key. Prompts request identity preservation, but this is **not guaranteed** by the app or model.

## What's implemented

- Original, mobile-first design, light/dark/system appearance, accessible actions, reduced animation, native tabs/stacks, camera and system photo picker.
- Three looks, per-photo consent, actual processing states (no invented percentages), cancellation, and resumable requests.
- Server-side anonymous sessions; native token storage in Keychain/Keystore. Browser preview uses local storage.
- Persistent SQLite beta credits, idempotent job submission, credit holds, exactly-once refunds, duplicate-request protection, restart recovery, and invite-gated live mode.
- Bounded uploads, pixel limits, EXIF removal, allowlisted looks, per-IP throttles, global daily attempt limit, output TTL and account isolation.
- Local photo collection, favorites, search, export, share, delete individual photos, clear collection, and delete beta session/server metadata.
- No photo bytes saved to the server database or application logs. Temporary outputs live in RAM for ten minutes. Device photos remain until deleted. Exported copies are controlled separately by the user.

### Billing is intentionally disabled

There are no real purchases, receipts, store products, or fake payment successes. Beta credits have no monetary value. Demo sessions start with 12 credits, can refill when two or fewer remain, and have a refill limit. Live sessions receive the operator-configured initial beta grant. Failed/cancelled processing returns the credit. An already successful edit is not refunded by cancelling afterward.

## Architecture

```text
src/app/             Expo Router routes only
src/screens/         Studio, editor, result, collection, settings, wallet, privacy
src/components/      Native-compatible UI, SVG artwork, UI-thread comparison
src/domain/          Shared public look catalog and API types (no secrets)
src/lib/             HTTP API, per-platform photo/session storage, export
src/state/           Persistent drafts, resumable jobs, local collection
src/theme/           Brand tokens, light/dark appearance
server/src/          Node 24 API, SQLite ledger, image validation, providers
server/test/         API integration and persistence tests
DESIGN.md            Design references and interaction contract
assets/CREDITS.md    Photo/font/artwork provenance
```

The API runs separately from Metro. Production needs a persistent Node 24 server and volume for `server/data/`; a stateless deployment will lose sessions/credits. Run **one API process** in this beta. Distributed execution requires shared rate limits, durable job storage and a worker queue. The prototype's RAM-based result TTL is not a durable cloud photo gallery.

## Checks

```powershell
npm run check
npm run smoke
npm run export:web
npm run export:all
npx expo-doctor
```

`check` runs mobile TypeScript, ESLint, API TypeScript and API tests. `export:web` checks the production web bundle. Native builds are configured in `eas.json`, but **no paid EAS job or store submission has been run**. Development-client builds additionally need `expo-dev-client` installed; Expo Go can exercise the bundled native modules used here.

`smoke` requires the app/API running via `npm run dev` and a cached/installed `agent-browser` CLI (`npx --yes agent-browser skills get core`). It refuses live-AI servers and exercises all three demo looks, actual file upload, export, comparison keyboard controls, persistence, search/favorites, offline recovery and appearance. Reports/screenshots go into ignored `artifacts/`. Automated accessibility checks are not a substitute for VoiceOver/TalkBack and real-device review. See `QA.md` for the validation performed.

### Security advisory status

The API's image library was updated to **sharp 0.35.5** and its dependency audit was clean at implementation time. Expo SDK 58's bundled development-tool dependency chain currently reports advisories rooted in `braces <=3.0.3` and `node-forge <=1.4.0`. The registry's latest versions still matched those advisories when checked. Do **not** run `npm audit fix --force`: it proposes incompatible Expo/RN downgrades. Keep Metro on a trusted private development network, never expose it as the production API, and recheck upstream fixes before release. An audit warning is not being represented as fixed or silently ignored.

## Public-launch blockers

- Live-image quality/cost benchmarks, face/detail preservation checks, real-device accessibility/performance and iOS/Android permission testing.
- Recoverable accounts, attestation/stronger anti-abuse, durable jobs and deployment hardening.
- Verified consumable store purchases, server-side receipt/webhook handling, purchase restoration and refund policies.
- Final branding, image/model-release rights, privacy policy, provider retention terms, and store disclosures.
- Actual developer-store accounts, bundle identifiers, signing, device builds, store review and operational budgets.

No revenue, retention, conversion, or image-quality performance is guaranteed by this codebase.
