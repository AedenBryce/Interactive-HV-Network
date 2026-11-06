# Saved owner layouts

Latest distribution default: [Owner layout `.9`](owner-layout-distribution-2026-11-06.json), paired with [its drawing](authored-distribution-2026-11-06.json). Captures the active Chrome export on 6 November before packaging. No positions, routes, labels or equipment were changed; only the layout revision was advanced. The prior `.8` pair and exact Chrome export are retained.

Previous final: [Final owner layout](owner-layout-final-2026-11-06.json), revision `authored-2026-11-06.8`, paired with [final drawing](authored-final-2026-11-06.json). Saved directly from the final Chrome export without changing positions, routes, names, symbols or labels. Editing now requires the owner-provided password on each entry to Edit Layout; Finish Editing and reload lock it again. This is a local browser UI lock, not server authentication. The exact export, scenario and prior pair are retained beside these files.

Previous: [Owner update with applied deletions](owner-layout-latest-2026-11-06.json), revision `authored-2026-11-06.7`, paired with [its drawing](authored-latest-2026-11-06.json). Captures the exact latest Chrome export, including all label positions, 8 deleted labels, names, rotations, asset positions and wire routes. The 3 marked drawing objects are now hidden and their pending marks cleared; their electrical conductor junctions remain intact. See [applied deletions](applied-deletions-2026-11-06.json). The exact owner export and prior default pair are retained in the `before-applied-deletions` files.

Previous: [SZ010 and conductor review](owner-layout-conductor-review-2026-11-06.json), revision `authored-2026-11-06.6`, paired with `authored-conductor-review-2026-11-06.json`. Retains the latest owner edits, repairs the SZ010 motor symbols/joins and separates the SW439 D/Y conductor routes. The pre-change owner export and drawing are saved as `owner-layout-before-conductor-review-2026-11-06.json` and `authored-before-conductor-review-2026-11-06.json`.

Earlier: [TF413A symmetrical branches, 6 November](owner-layout-tf413a-symmetry-2026-11-06.json), revision `.5`. Preserves owner Chrome edits and centres the A/B downstream columns equally around TF413A, with matching bend, switch and endpoint heights. The pre-change owner export and drawing are saved as `owner-layout-before-tf413a-symmetry-2026-11-06.json` and `authored-before-tf413a-symmetry-2026-11-06.json`.

Earlier: [Branches brought closer](owner-layout-branches-closer-2026-11-06.json), layout revision `.4`. The complete TF04 component moves right by 5000 drawing units; the Hopper 1 / Hopper 3 group moves left by 12000 units into the owner's marked space. Connecting routes follow the moved groups. The earlier [Condensed owner layout](owner-layout-condensed-2026-11-06.json), revision `.3`, remains saved.

Before the branch moves, the exact owner Chrome export and authored drawing were saved as `owner-layout-before-branch-moves-2026-11-06.json` and `authored-before-branch-moves-2026-11-06.json`. Restore these together if reverting this move.

The condensed arrangement contracts by 20% on each axis while text and symbol sizes stay unchanged. Local minimum symbol clearances are retained, and excess frame padding is reduced. Electrical topology, baseline states and interlocks are unchanged.

Fallback: [Pre-condense saved version](pre-condense-2026-11-06/README.md), revision `authored-2026-11-06.2`. This includes the exact active Chrome export, authored drawing, source archive and built application. The earlier [Equipment label polish](owner-layout-label-polish-2026-11-06.json) is also retained.

The exact Chrome export before this pass is retained as [Owner layout before label polish](owner-layout-before-label-polish-2026-11-06.json). The earlier [Owner edits](owner-layout-latest-edits-2026-11-06.json) are also retained.

Earlier snapshots:

- [Owner layout before aligning the supply starts](owner-layout-before-supply-alignment-2026-11-05.json).
- [Vertical TF04 line with lateral spurs](owner-layout-tf04-vertical-2026-11-05.json).

- [Owner layout before the vertical arrangement](owner-layout-before-tf04-vertical-2026-11-05.json).
- [TF04 branch moved to the far left](owner-layout-tf04-left-2026-11-05.json).
- [Owner layout before the far-left move](owner-layout-before-tf04-left-2026-11-05.json).

The latest snapshot is also the application's default reviewed layout. Each snapshot preserves asset positions, line routes, custom names, object rotations, appearance and deletion marks.

The TF04 supply runs vertically down the far left to RM420/Hopper10, with seven existing scope-boundary spurs branching left and right at their modeled junctions. RM420's downstream equipment keeps its internal arrangement. Assets outside the TF04 component remain in their owner-reviewed positions. Electrical topology, baseline states and interlocks are unchanged.

