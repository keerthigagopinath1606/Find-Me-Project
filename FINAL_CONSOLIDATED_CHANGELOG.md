# Find-Me AI — Consolidated Final Build

## Notifications
- Backend/SQLite remains the single source of truth for citizen notifications.
- Verification/rejection creates the notification for the complaint owner's account.
- Citizen dashboard count uses unread backend notifications only.
- Citizen notification page reports backend errors instead of falsely showing an empty page.
- One-time cleanup marker upgraded so an existing database from an earlier final build is cleaned once.
- Legacy browser notification entries are not used as the displayed notification source.

## AI video upload
- Investigation video upload limit increased from 100 MB to **1 GB** in Flask.
- Frontend also validates the 1 GB limit before upload.
- 413 error text now explicitly states the 1 GB limit.

## AI identity safety
- A raw FaceNet embedding similarity is no longer presented as an identity match.
- Weak closest embeddings are shown only as unconfirmed investigation observations.
- Possible-match qualification now requires stronger face evidence:
  - strong face evidence >= 80% with overall >= 70%, or
  - repeated face evidence >= 74%, repeated at least twice, with top-two average >= 72% and overall >= 68%.
- Emergency alerts use the same stronger identity gate.
- No artificial similarity boosting is used.
- No automatic face box/circle is burned into CCTV evidence.

## Motion and UI
- Removed continuous AI upload-card sweep and button shimmer.
- Removed repeated page-animation triggers caused by observing every DOM mutation.
- Page transitions now run only when the actual page/root child changes.
- Forms remain stable while the user selects video and enters CCTV location/date/time.
- Processing animation is limited to the active AI-processing state.
- Result cards use one-time entrance animations.
- Reference/CCTV comparison images use `object-fit: contain` so the complete images remain visible.
- Comparison beam no longer continuously pulses.
- Administrator and citizen surfaces retain distinct professional visual language.
