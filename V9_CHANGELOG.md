# FIND-ME AI — V10 Change Log

V10 is built from the uploaded V8 Emergency Movement build.

## Implemented
- Multi-frame candidate aggregation.
- Repeated-observation tracking across different sampled frames.
- Face-quality filtering: face size, sharpness, exposure and detector confidence.
- Correct face-region coordinate mapping after CCTV frame upscaling.
- Best-evidence selection.
- Unique candidate grouping: multiple detections of one case are shown as one candidate.
- Raw detection records retained for investigation/audit.
- Face similarity remains separate from the weighted overall candidate score.
- Movement-aware location scoring and chronological movement timeline.
- Clothing remains supporting evidence; clothing changes do not automatically reject a candidate.
- Persistent emergency alerts with alert reason, evidence snapshot, priority and officer workflow.
- Global in-app alert bell with badge, toast alerts and optional browser notifications.
- Duplicate alert prevention per case/video.
- Actual verifying administrator, verification time, enquiry result and enquiry notes stored in backend.
- Citizen forgot-password/reset-code flow.
- Citizen registration immediately signs the user in after successful registration.
- Existing Administrator Dashboard visual arrangement is preserved.

## AI safety behavior
- Thresholds were not lowered to manufacture matches.
- Weak/low-quality faces are filtered before matching evidence is accepted.
- A candidate is never treated as a confirmed identity automatically.
- Emergency alerts are possible-sighting leads requiring authorized officer verification.

- Fixed V10 AI Identification crash: face-quality metadata is now calculated before use, with weak observations filtered safely.
