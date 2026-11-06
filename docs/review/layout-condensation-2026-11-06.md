# Layout condensation — 6 November 2026

The pre-condense version is preserved in `docs/layout-versions/pre-condense-2026-11-06/`, including the active Chrome export, authored drawing, source archive and built application. The new layout revision is `authored-2026-11-06.3`; the electrical model remains `construction-2026-11-06.12`.

Equipment anchor extents contract from 109538.57 × 62241.38 to 87630.86 × 49793.11 drawing units: 20% less width and height, or 36% less area. Symbol scale stays 4, text scale stays 2 and line width stays 1.4. The relative overall arrangement is retained. Small local offsets protect glyph footprints, removable-contact clearances and integrated-earth tags where a uniform contraction would make them touch. All 700 equipment identities and 693 electrical connections are retained.

The saved presentation is baked into the authored drawing; it does not add a repeated runtime global-layout search. Custom names, rotations, bus-earth takeoff choices, appearance and deletion marks are retained, apart from a line break in the MC419 incoming-earth caption. Frame padding is reduced through an optional layout-specific setting. Older layouts retain their existing frame padding. A final caption-placement pass checks captions against the cleared wire routes.

Validation: the authored loader verifies model fingerprint, equipment/connection identities and attached endpoints. The presentation audit checks 664 captions and 70 frames with zero caption collisions, caption/wire intersections, captions outside frames or overlapping frames. Comparing body bounds with the saved pre-condense geometry found no new equipment-body intersections. The contraction exposed a TF420A–MC420 input-route hairpin; its presentation override now connects directly above the MC420 bus instead of passing through that bus and a motor output. No topology or source-connectivity rule changed.

All 32 targeted session, switching-symbol and layout-save tests passed. TypeScript checking and the production build passed. Chrome loaded the new build, asset search/focus worked, RM714 was inspected at the same 26% zoom as before, and no console errors were recorded during that check. Whole-network fit cannot make all 700 equipment captions legible simultaneously on one monitor; the contraction increases how much equipment is visible at a readable zoom.

The two broader layout-test discrepancies recorded in the earlier equipment-label review were not used as acceptance checks for this operation.
