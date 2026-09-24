# Find-Me — Final Stability Fixes

This build consolidates the final fixes without changing the existing professional UI.

## Fixed

- Fixed a misplaced backend identity-gate block that could break complaint submission and video-analysis responses with undefined variables.
- Fixed AI result leakage: analyzed-but-unqualified faces are no longer returned/rendered as possible identity matches.
- A weak closest embedding score is not treated as an identity probability.
- Candidate names, case IDs, reference photos and evidence are only exposed as a possible match after the configured face-evidence gate is met.
- `matches_found` and `unique_candidates` now count only qualified possible matches.
- Investigation-only candidates remain available in `candidate_analysis` for audit/history.
- Removed the old application-wide subtree MutationObserver animation engine that caused AI forms and result cards to blink whenever DOM content changed.
- Kept purposeful page entrance transitions and AI processing animation only while processing is active.
- Kept comparison photos uncropped (`object-fit: contain`) and removed visual face highlighting overlays.
- Video upload limit remains 1 GB in both backend and frontend validation.
- Backend notifications remain the source of truth; opening Notifications does not delete them. Clear Notifications explicitly deletes them.
- Admin verification/status changes continue to create a backend notification for the citizen who submitted the complaint.

## Validation

- `python -m py_compile backend/app.py backend/config.py` — passed.
- `node --check frontend/app.js` — passed.
- Browser/end-to-end execution still depends on installing the requirements on the user's Windows machine.
