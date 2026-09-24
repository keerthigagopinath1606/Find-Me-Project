# FIND-ME AI — V15 CHANGELOG

## Emergency Alert Center fix
- Fixed `formatPercent is not defined`.
- Emergency alerts now use a locally available percentage formatter.
- Alert score, face, clothing, age, location and time values render safely.

## Application-wide animation fix
- Fixed the V14 transition layer so it detects render methods attached
  directly to the application instance as well as prototype methods.
- Added a DOM-based page-change observer so animations trigger when
  Find-Me replaces page content with `innerHTML`.
- Added reliable page entrance animation.
- Added staggered card entrance animation for dashboard, investigation,
  alert and result cards.
- Added a dedicated emergency-alert entrance animation.
- Preserved reduced-motion support.
- Kept the existing professional UI/layout intact.

## AI Investigation
- Existing V13/V14 AI processing animations remain intact.
- No AI score is artificially increased by this version.
- No threshold or human-verification rule is removed.
