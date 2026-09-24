# FIND-ME AI — V17 CHANGELOG

## 1. Application-wide animations
- Fixed the transition mechanism to animate the actual page element after navigation/DOM replacement.
- Added visible page entrance and staggered card/item transitions across Home, Login, Citizen, Admin, Notifications, Emergency Alert Center and Investigation pages.
- Added subtle hover movement for cards while preserving the existing Admin Dashboard layout.
- AI Investigation animations remain unchanged and are preserved.
- Reduced-motion support remains enabled.

## 2. Real email notifications
- The old "Email" preference was an in-app simulated email drawer, not external email delivery.
- Added optional SMTP delivery through environment variables.
- Added `preferred_contact` persistence for complaint-giver records.
- Backend notifications can now send a real email to the registered user's email when SMTP is configured.
- Email sending is asynchronous so it does not block AI processing.
- If SMTP is not configured, the app clearly remains in in-app notification mode.

## 3. AI
- No AI score fabrication or threshold manipulation.
- Existing AI identification pipeline and human verification rules are preserved.
