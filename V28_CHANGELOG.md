# Find-Me V28 — Notification & Verification Fix

## Fixed
- Administrator **Verified & Active** status now updates the backend complaint record.
- Backend creates the citizen's `Case status updated` notification from the same status change.
- Citizen Notifications now read from `/api/notifications` instead of the legacy localStorage notification list.
- Added `/api/notifications/clear` for the signed-in user's notifications.
- One-time V28 migration clears stale legacy/backend citizen notifications so old notifications do not reappear.
- Added a **Clear Notifications** button for the signed-in citizen.
- Backend remains the source of truth; localStorage is only a legacy UI cache.
- Existing AI pipeline, scoring, speed optimizations, evidence behavior, and UI structure are preserved.

## Verification flow
Administrator:
Verified & Active → backend stores `Verified` → backend creates notification → citizen account fetches `/api/notifications`.

The citizen notification is generated only for the citizen who owns the complaint.
