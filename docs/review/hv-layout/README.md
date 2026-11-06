# HV network layout review

Open the [interactive tool](http://127.0.0.1:5176/). Revision `authored-2026-11-05.5` is a complete drawing of the existing model. The owner selected delivery for manual review on 5 November. This completes the layout delivery; electrical-model acceptance and further owner-requested visual changes remain separate.

Use the asset search to focus a breaker, switch, transformer or motor. Click the asset for its permitted actions. Wheel to zoom, drag to pan, and use **Fit view** to return to the complete network. The right-hand details panel can be minimised.

## Review images

These are vector exports of the actual geometry and agreed simulation baseline, not browser screenshots. Zoom into the SVGs for equipment detail; the interactive tool is the primary review surface.

- [Complete overview](overview.svg)
- [SW411 parent switchroom](sw411.svg)
- [SW426 switchgear detail](sw426.svg)
- [Complete TF04 to RM420 branch](tf04-rm420.svg)
- [SW505 transformers and drives](sw505.svg)

## Verified delivery evidence

| Requirement | Evidence |
|---|---|
| Preserve the electrical model and accumulated confirmations | Current whole-model canonical fingerprint equals the frozen baseline; model version `construction-2026-10-23.11` |
| Preserve exact network identity | All 684 asset IDs, 677 connection IDs/terminal pairs and 1,206 terminals match the frozen inventory |
| One complete canvas with stable ownership | 70 authored modules, one owner per asset, 29 non-overlapping room frames; every route present |
| Top-down arrangement | All 85 primary display links have downstream endpoints below upstream endpoints; SW411 spans downstream columns; TF04/RM420 occupies the outer column |
| Stable layout | Rigid composition from explicit module origins; browser asset transforms identical across switching and reload |
| Direct loading | Current model loads the validated artifact directly; historical models retain their existing separate loading path |
| Clear routes and boundaries | No detached endpoints, diagonals, unrelated symbol/label/bus cuts, ambiguous shared wires, frame overlaps or unrelated room passages in the audits |
| Working navigation and switching | Browser review exercised search, action popup, contact/racking restrictions, wheel zoom, pan, fit and details minimisation |
| Zoom continuity | All 646 intentionally displayed symbols and labels remained present from 45.2% through 2.49%; hidden handoff identities remain in the model |
| Production checks | Production build and 64 focused tests passed |
| Saved images | Five XML-valid SVGs with source/image SHA256 hashes in [manifest.json](manifest.json) |

Audit sources are `tmp/authored-geometry-audit.json` and `tmp/authored-review-audit.json`. The exact baseline is `docs/goals/hv-layout-baseline.json`; recovery material remains in `tmp/hv-layout-baseline-20261105/`.

## Remaining visual limits

- Nine ring crossings and 21 external feeder crossings remain. All have a verified visible gap, preserving each route's endpoints through seven tested zoom scales. The owner accepted delivery of the earlier version with 65 separated feeder crossings; the final version contains 21 after additional validated local corrections.
- One gap near a bend is narrower to preserve the adjacent terminal/line stub. Twelve label-card boundary touches are recorded; the audits found no line entering text/card interiors.
- At whole-network fit, room/source identifiers provide orientation. Search or zoom reveals individual equipment labels and switching detail.

Electrical correctness and live site configuration are separate from this layout review. This packet does not record whole-model owner acceptance.

## Move objects and propose deletions

Select **Edit layout**. The default tool is **Box select and move**: drag a rectangle from empty space around any assets or tags, then drag any selected object or empty space inside the dashed selection to move everything together. A fully enclosed switchroom frame moves with all its members. Shift-drag adds another rectangle; **Clear selection** or Escape clears it. Alt-drag or the **Pan** tool pans the canvas. **Single asset** and **Whole switchroom** remain optional tools. **Undo layout change** reverses the entire group movement as one action; **Reset positions** restores this authored drawing while retaining deletion marks.

Select an asset/tag and use **Mark selected asset for deletion**, or box-select multiple objects and use **Mark selection for deletion**. The crossed-out asset remains part of the electrical model. The **Deletion marks** list lets you focus or unmark each asset. Actual removal and database/model repair are a separate batch-review step.

Positions and marks save locally in this browser, scoped to the model and layout revision. Use **Download review** after your edits to share a JSON file containing both positions and deletion marks. **Finish editing** returns to switching mode.

Revision .5 places SW441, TF441 and MC441 above/right of SR411, with longer TF11/TF12 incoming runs and the original confirmed OPF1-7 spur relationship preserved.

Hidden incoming cable joins follow their connected visible device when a selection moves, including for saved moves made before this correction.

Moved inter-room connectors are rebuilt as minimum-distance orthogonal paths, with at most two bends, instead of retaining historic waypoints. Internal wiring inside a rigidly moved group retains its shape. The default SW421 feeder also uses a direct three-section path. Saved positions remain compatible.
