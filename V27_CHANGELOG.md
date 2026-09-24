# Find-Me V27 — CCTV Accuracy Enhancement

## What changed

- Keeps V26's fast OpenCV CCTV face screening.
- Adds **lazy FaceNet512 reference-template enhancement**:
  registered-photo variants are generated only when a candidate becomes plausible,
  instead of at every video startup.
- Adds a **targeted face-alignment pass** for the strongest one or two candidates
  on multi-person CCTV frames.
- Alignment is performed on the detected face crop, not on the whole frame.
- The final identity candidate can be updated only from actual face similarity
  evidence; clothing/location/time remain supporting clues.
- Keeps the existing measured processing-time behavior.
- Keeps the no-highlight evidence policy: saved CCTV evidence remains the
  original frame without red boxes, circles, or identity labels.

## Why

V26 restored fast face detection, but the observed best FaceNet similarity was
68.87% for the test candidate. V27 tries to improve the underlying measurement
by using more compatible reference templates and better face alignment only on
plausible candidates. It does **not** artificially add points to the score.

## Testing

Use the same registered missing-person photo and then test with real CCTV
footage containing the person at different angles/lighting. Compare:

- best face similarity
- number of detected faces
- frames with faces
- candidate identity
- processing time

A higher score is not guaranteed; the purpose is more reliable recognition.
