# Find-Me Fast + High-Similarity AI Update

## Changes
- CCTV frames now use a fast OpenCV Haar proposal detector in the hot path instead of running RetinaFace on every sampled frame.
- FaceNet512 remains the primary identity model.
- RetinaFace is retained for targeted final alignment of the strongest candidate.
- Query augmentation (lighting, blur, lower-face masking/occlusion tolerance) is generated only for the leading candidate.
- EfficientNet-B0 is retained as secondary visual corroboration and runs only for the leading candidate.
- Strong repeated evidence can end processing early to avoid unnecessary decoding.
- The FaceNet similarity shown remains an observed similarity score; it is not artificially inflated.

## Expected demo behavior
For normal short/medium CCTV demo clips on a CPU machine, the processing path is designed to stay below one minute in typical conditions. Actual time depends on video duration, resolution, number of faces, and number of verified missing-person records.
