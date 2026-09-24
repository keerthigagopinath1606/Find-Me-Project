# Find-Me V21 Change Log

## Wrong-person evidence marker fix
- V20 used fast OpenCV Haar detection for all CCTV frames. On frames containing multiple people, Haar can produce imprecise boxes and the evidence marker may point at the wrong person.
- V21 keeps the fast Haar screening path for speed.
- When a sampled frame contains more than one detected face, V21 performs one accurate RetinaFace second-pass detection on that frame.
- Final FaceNet512 comparison and evidence annotation use the refined face boxes.
- This is targeted only at multi-person frames, preserving the V20 speed optimization for normal single-person frames.

## Evidence consistency
- The red evidence marker is generated from the same refined face region used for candidate comparison on multi-person frames.
- The registered missing-person image and CCTV evidence therefore refer to the same detected face region.

## Safety
- AI output remains a possible-match candidate and still requires authorized human verification.
