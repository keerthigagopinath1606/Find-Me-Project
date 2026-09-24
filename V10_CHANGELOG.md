# FIND-ME V10 Update

## Fixes and improvements

- Fixed Forgot Password so the button uses robust event-delegated handling and opens a working recovery dialog.
- Password recovery accepts either the registered citizen email or username.
- Offline expo reset-code flow remains supported with a 10-minute one-time code.
- Preserved secure citizen-only password reset; administrator credentials are not reset through the public flow.
- AI Investigation now distinguishes between **possible matches that crossed the gate** and **candidates that were analyzed but remained below the gate**.
- Added `candidates_analyzed` and `candidate_analysis` to the AI processing response.
- AI UI now shows "Possible Matches Found" separately from "Candidates Analyzed".
- A below-gate candidate is explicitly shown as a candidate under analysis rather than incorrectly described as having no candidate at all.
- Emergency alerts remain gated: a below-threshold candidate does not create a false emergency alert.
- Existing emergency alert creation, notification bell, browser notification support, movement-aware scoring, clothing support, face-quality filtering, multi-frame aggregation, and human officer review are preserved.
- Existing Admin Dashboard layout and visual arrangement are preserved.

## Important scoring rule

No AI score is artificially increased and no threshold is lowered merely to manufacture a match. A candidate remains a candidate until the configured evidence gate is genuinely satisfied.
