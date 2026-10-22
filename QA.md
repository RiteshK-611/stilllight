# MVP validation

## Environment and scope

- Windows, Node 24.19.0, Expo SDK 58, Chrome 155 via agent-browser.
- API in **demo** mode; no paid AI calls, cloud builds, purchases or store submissions.
- Phone-size browser companion tested at 390 × 844, plus a 320px-wide result layout.
- Native bundle generation is not proof of execution on an iOS/Android device.

## Checks

- `npm run check`: mobile TypeScript, mobile ESLint, API TypeScript and 13 API/ledger tests.
- `npm run smoke`: 12 browser checks across all three demo looks, with screenshots and accessibility reports in `artifacts/`.
- `npm run export:all`: production web bundle plus iOS and Android Hermes bundles.
- `npx expo-doctor`: 20/20 checks passed.
- API dependency audit: no known advisories at implementation time. Root Expo dependency audit still reports 19 high advisories; see README security notes. No force downgrade applied.

## Browser flow exercised

1. Studio loads at phone size with reduced-motion preference.
2. Sample photo → explicit consent → actual demo image processing → saved result.
3. Favoriting and accessible keyboard adjustment of the comparison divider.
4. Export/download action completes (not a native Photos permission test).
5. Result page: zero automated WCAG A/AA violations.
6. Collection survives reload; favorite filter and search work.
7. Actual file input upload → After hours processing.
8. Soft studio processing and no horizontal page overflow at 320px.
9. Core editing flow has no browser console errors.
10. Offline API error is readable; reconnection recovers the existing session.
11. Dark Studio: zero automated WCAG A/AA violations.
12. Appearance switches between light and dark.

The automated contrast engine flags some text over photographs/gradients as **incomplete**, not passed. Those overlays still require manual review; this document does not claim full accessibility certification. Screenshots wait for visible image assets to load. File-upload automation intercepts headless Chrome's immediate OS-dialog cancellation only, then supplies a real image file; API responses and image processing are not mocked.

## API/ledger coverage

Demo defaults and live-mode config gating; authentication; actual transformed output; idempotent replay and concurrent duplicates; input/consent/look validation; provider failure refunds; cancellation and late-upload protection; account isolation; browser-origin allowlist; refill restrictions; SQLite restart recovery; exactly-once expiry refunds and delivered-result accounting.

## Still untested / not ready for public sales

- Live Gemini image quality, identity preservation, current model availability/pricing and actual generation costs.
- Physical iPhone/Android behavior: camera/library permissions, sharing, Photos saving, native SwiftUI/Compose controls, VoiceOver/TalkBack, large text, memory pressure and interruptions.
- Store purchases/restore, signed native binaries, production hosting, account recovery and distributed abuse controls.
- Final commercial photo/model-release rights, brand clearance, provider retention terms and published privacy policy.

This is a runnable private beta MVP, not a claim of a completed commercial release.
