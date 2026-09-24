# FIND-ME AI — Final Expo Feature Checklist

## Core
- [x] Flask application and frontend served together
- [x] SQLite database as backend source of truth
- [x] Citizen and Administrator roles with JWT authentication
- [x] Existing professional responsive UI and animations preserved
- [x] Stable LAN server entry point

## Citizen / public workflow
- [x] Registration and login
- [x] Missing-person complaint registration
- [x] Complaint giver name, relationship, phone, email, address, city/state
- [x] Complaint-giver ID proof type/reference
- [x] Automatic Complaint ID, Complaint-Giver ID and Missing-Person ID
- [x] Missing-person photo and detailed physical profile
- [x] Last-seen location/date/time
- [x] My Reports and case details
- [x] Delete report with backend synchronization
- [x] Sighting submission with optional evidence photo
- [x] Notifications for case updates

## Administrator / investigation workflow
- [x] Separate administrator login and protected admin APIs
- [x] Dashboard statistics and case counts
- [x] All cases / missing persons
- [x] Search by identifiers, name and location
- [x] Verification and status management
- [x] Enquiry/remarks saved to backend
- [x] Deleted cases
- [x] Activity/audit log
- [x] Investigation timeline/history
- [x] Notifications
- [x] Last-seen information
- [x] Evidence workflow
- [x] Investigation Center parent navigation
- [x] Live Camera screen (camera only)
- [x] Phone Camera Video screen (upload only)
- [x] CCTV Video screen (upload only)
- [x] AI Identification screen (upload + AI processing + results)

## AI / computer vision
- [x] Face detection with RetinaFace and OpenCV fallback
- [x] FaceNet512 embeddings
- [x] Verified-record-only video matching
- [x] Multiple-face protection during registration
- [x] Background embedding generation after database status commits
- [x] V5 normalized reference templates for registration photos
- [x] V5 direct video face-crop comparison
- [x] V5 repeated-evidence gate for possible matches
- [x] Similarity and confidence output
- [x] Best observed similarity diagnostics
- [x] CCTV/mobile video frame analysis
- [x] Evidence frame capture for possible matches
- [x] Officer-review workflow; AI never claims legal identity confirmation

## Smart case features
- [x] AI-assisted duplicate-case screening
- [x] Case timeline
- [x] Case status history
- [x] Sighting/evidence linkage
- [x] Statistics/analytics data for dashboard
- [x] Notifications and audit trail

## Security / reliability
- [x] Password hashing
- [x] JWT authentication
- [x] Role-based endpoint protection
- [x] File extension validation and generated filenames
- [x] 1 GB investigation video upload limit
- [x] SQLite WAL, busy timeout and retry handling
- [x] Thread-safe write coordination
- [x] India (Asia/Kolkata) timestamps
- [x] No public administrator-creation endpoint

## V8-style final improvements included in this build
- Professional administrator command-desk layout with the Investigation Center intentionally positioned as the final/bottom-stage workspace.
- Emergency Alert Center with persistent alert IDs, severity, status, evidence, score breakdown, acknowledgement, resolution and dismissal.
- Possible-match alerts notify authorized administrators and the complaint-giver while explicitly stating that identity is not confirmed.
- Location relevance is movement-aware: different locations are not automatically treated as a mismatch. Recognized Indian places use approximate offline geographic distance; unknown places use neutral contextual scoring.
- Clothing is explicitly treated as supporting evidence and may change between sightings; clothing differences do not independently eliminate a face candidate.
- AI result text explains movement and appearance context for officers.
- Best face similarity is kept separate from the overall candidate score.
