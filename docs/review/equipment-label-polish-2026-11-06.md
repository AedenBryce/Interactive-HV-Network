# Equipment label polish — 6 November 2026

Layout revision: `authored-2026-11-06.2`. Model: `construction-2026-11-06.12`.

The active Chrome layout was exported before editing and retained in `docs/layout-versions/owner-layout-before-label-polish-2026-11-06.json`. The polished default is saved separately as `owner-layout-label-polish-2026-11-06.json`.

Display changes: concise equipment captions; breaker labels restricted to the right; earth tags beneath their symbols; consistent wrapped integrated-earth tags; collision-aware placement and frame fitting; short solid annotation leaders where directly aligned with the owning object. Full model annotations remain available in equipment details.

Position changes are limited to two breaker-row alignments, six earth switches moved clear of removable-contact markings, and three earth switches shifted horizontally to clear phase lines. No global layout reflow or electrical model changes were made.

Run `node scripts/audit-equipment-presentation.mjs --check` to reconstruct the shipped geometry and check the saved appearance (symbol scale 4, text scale 2). Result: 664 captions, 70 frames; zero caption/caption, caption/other-object or caption/circuit-wire intersections; zero captions outside their owning frames; zero overlapping frames. The audit includes 36 integrated-earth captions, ten converter D/Y annotations and the equipment phase leads. Converter controls retain distinct DC-earth and output-contact captions; duplicate VSD lettering is removed from inside the glyph. These are geometry checks for the saved layout, not a guarantee for future manual edits or a verification of installed equipment.

TypeScript checking and the production build passed. The targeted 40-test run passed 37 tests initially; the caption-side failure was corrected and its two focused caption tests then passed. Two broader assertions remain unresolved: RM413 IN02's placement conflicts with a generic incomer-above-bus test; a room-gap assertion expects 371 units but measures 244 between stockpile/wet-hv and cv006/rm406-hv. The frames do not overlap. These are retained as explicit review limits rather than changing the owner's arrangement to satisfy unrelated layout assertions.

