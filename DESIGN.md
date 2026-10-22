# Stilllight — MVP design contract

Working name only. Trademark and App Store availability have not been cleared.

## Direction

A pocket photo atelier, not a dashboard. Warm ivory, ink, vermilion, generous spacing, editorial serif headlines, and platform-native body typography. Photography is the main interface. Never imitate Boothie's brand, screens, copy, or image assets.

## References studied

- Boothie: https://boothieapp.com — one photo / one look / export clarity, not its artwork.
- Dazz Cam: https://apps.apple.com/us/app/id1422471180 — photographic look selection; reduce navigation complexity.
- Tezza: https://apps.apple.com/us/app/id1393061654 — editorial hierarchy; avoid a large multi-tool editor.
- Apple HIG: https://developer.apple.com/design/human-interface-guidelines/ — touch, safe areas, permissions, Dynamic Type.
- Official Expo native UI, routing, project-structure, and animation skills: https://github.com/expo/skills (read directly; no paid MCP used).
- `frontend-design` and `apple-design` guidance loaded in this session. Mobbin/Sleek MCP was not connected or used.

## Scope

Studio → select a photo or sample → choose one of three looks → consent → process → compare → export. Separate Collection and Settings screens. Credit wallet is a native modal. Native stack transitions; no animated tab transitions. UI-thread before/after drag, with accessible Original/Edited alternatives. Accessible hit targets at least 48 points, readable errors, no fake progress percentages.

## Honesty & privacy

Demo is always labeled DEMO, including in saved edit metadata. Demo effects are real local color/exposure transformations, not AI. Example look thumbnails are styled demonstration photography, not claims about generative model quality. No fabricated testimonials, download counts, or billing successes. Real API processing requires explicit AI_MODE=gemini, an invite, and per-photo consent. Photos are not written to the server database or logged. Results expire from server memory. Device collection uses local app storage; exported copies are controlled by the user.

## Release boundaries

This is a private beta MVP, not a store-ready commercial launch. Purchases are disabled. Before public release: verified consumable purchases, recoverable account identity, distributed rate limiting/attestation, commercial image rights, provider privacy terms, moderation review, quality benchmarks, accessibility on real devices, developer accounts, and store review.
