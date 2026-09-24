# Final Stable AI Video Fix

- Long CCTV processing no longer holds one browser fetch connection open.
- Added background AI processing endpoint and short polling status endpoint.
- Existing synchronous AI pipeline remains the source of truth.
- Adaptive CPU sampling:
  - up to 2 min: 1.25 s
  - 2–5 min: 2.0 s
  - 5–10 min: 2.5 s
  - over 10 min: 3.0 s
- The identity qualification gate is unchanged; weak face similarity is never promoted to an identity match.
- 1 GB upload limit remains enabled.
- Processing-stage UI remains visible while the background job runs and shows elapsed time.
