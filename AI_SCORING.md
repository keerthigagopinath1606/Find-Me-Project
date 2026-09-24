# FIND-ME V6 — Multi-Clue AI Candidate Scoring

The V6 investigation pipeline is aligned to the supplied project presentation's intelligence layer: Face Similarity + Clothing Analysis + Age & Location Context, with time relevance included in the final candidate ranking.

## Pipeline

CCTV / phone video / live-camera investigation
→ face detection
→ FaceNet512 embedding
→ face similarity
→ clothing/appearance similarity
→ age compatibility
→ location relevance
→ time relevance
→ weighted candidate score
→ evidence snapshot + explanation
→ Possible Match
→ authorized investigator verification

## Weighted score

```text
Overall Candidate Score =
    Face Similarity       × 0.40
  + Clothing Similarity   × 0.20
  + Age Compatibility     × 0.15
  + Location Relevance    × 0.15
  + Time Relevance        × 0.10
```

All clues are normalized to 0–100. The application calculates the values from the registered case and the analyzed video frame; it does not hard-code the presentation's sample values.

## Prototype implementation notes

- **Face similarity:** FaceNet512 cosine similarity using the verified missing-person reference embedding plus normalized face templates.
- **Clothing similarity:** HSV appearance-distribution comparison of the registered portrait's lower/upper-body context and the corresponding CCTV context. This is a prototype appearance clue, not semantic clothing recognition.
- **Age compatibility:** DeepFace age analysis is attempted lazily. If the optional age model is unavailable, the score is explicitly neutral (50) rather than inventing an estimate.
- **Location relevance:** compares the registered last-seen location with the officer-entered CCTV/camera location using normalized location-token overlap.
- **Time relevance:** compares the registered last-seen date/time with the officer-entered CCTV capture date/time using a decreasing time-window score.
- **Evidence:** the strongest qualifying frame is stored under `backend/uploads/temp_frames/` and linked to an Evidence record.
- **Human-in-the-loop:** a candidate is never treated as an automatic identity confirmation.

## Possible-match gate

A candidate is returned when the overall candidate score is strong enough or when repeated observations provide supporting evidence. The UI labels the result as **POSSIBLE MATCH — OFFICER REVIEW**.

## Presentation metrics

Any numerical performance values shown in the presentation are prototype-evaluation claims and should only be presented as measured results after the final live test. V6 does not fabricate evaluation statistics.

## Movement-aware location and clothing handling
Location is not a hard equality check. A candidate seen in a different city can still be relevant because a missing person may move. When the prototype recognizes both places, geographic distance is used as a contextual score; otherwise a conservative neutral contextual score is used.

Clothing is a supporting appearance clue. A person can change clothes after the last-known sighting, so a clothing difference is not treated as an automatic rejection. The officer should review face evidence, age, time, location and evidence snapshots together.

The dashboard and alert UI explicitly describe these limitations. Scores are prototype decision-support indicators, not identity proof.
