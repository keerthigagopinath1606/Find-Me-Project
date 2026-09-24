# FIND-ME AI — V18 CHANGELOG

## Investigation Center
- Reorganized the five technical tabs into three clear primary sections:
  1. Investigation
  2. CCTV & Movement
  3. Security & AI
- Candidate Comparison is inside Investigation.
- CCTV Network is inside CCTV & Movement.
- Security & Privacy and AI Evaluation are inside Security & AI.
- Updated the Investigation Center header from V13 to V18.
- Added sticky primary navigation so the three main options remain visible.
- Added clear secondary navigation and active states.

## Animations and transitions
- Fixed the root selector: the shipped application uses `#app`, not `#findme-app-root`.
- Added real page entrance animation on actual rendered content.
- Added staggered card/section/form animations.
- Added button/link/card hover transitions.
- Added focus transitions for form controls.
- Added modal entrance/backdrop transitions.
- Added Investigation Center tab transitions.
- Added notification/toast entrance animation.
- Preserved reduced-motion support.
- Existing AI Identification processing animations are preserved.

## Email notifications
- Added automatic `.env` loading using python-dotenv.
- Email preference now controls citizen external-email delivery.
- Email / Either sends registered-user notifications by SMTP when configured.
- Phone does not trigger external email for citizen notifications.
- Added `/api/email/status` to show whether SMTP is configured for the logged-in account.
- Added clearer Email preference helper text.
- No email password is stored in the ZIP.

## AI result wording
The next UI update should use:
- Possible Match Observations
- Unique Possible-Match Candidates
- Repeated Observations
- Detections in Current Video
so observations are not confused with unique candidates.
