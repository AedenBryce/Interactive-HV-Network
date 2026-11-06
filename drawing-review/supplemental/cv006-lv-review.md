# MC410A first LV bus: supplemental source review

Reviewed 22 October 2026. This record supports the MC410A endpoint extension, not acceptance of the installed arrangement, starting configuration or switching permission. It is separate from the original supplied-PDF intake counts.

## Source and provenance

| Field | Verified local source / recorded provenance |
| --- | --- |
| Local PDF | `drawings/supplemental/520CBC0003-2140-DR-EL-0002_rev6.pdf` |
| Printed drawing | `520CBC0003-2140-DR-EL-0002`, MC410A 415 V motor control centre, single line diagram sheet 1 of 2 |
| Revision | 6, 08.04.22, AS BUILT; page 1, revision row H and title block H / 11-12 |
| Local PDF SHA-256 | `1113b6e86ba6b7bc4d3ee170572ee4692527464d91bbfd928a28f28d9f74777d` - independently recomputed from this local file |
| Full-page visual material | `tmp/pdfs/mc410a-first-bus.png`, independently inspected in full; render SHA-256 `619b265027255547ded0e60497ce2385f2d78ffc1c1e4923598ed525a7660e2a` |
| Portal attachment identity | `520CBC0003-2140-DR-EL-0002_6_AB_01.pdf`, recorded for the exact document ID |
| PIMS metadata supplied during review | Exact document `520CBC0003-2140-DR-EL-0002`: CurrentRevision6, CurrentStepAB, IsSupersededfalse; indexed filenames `13419431-3e24-47c3-a710-6c0760c66bc8.pdf` and `3b4f5e00-a738-4223-973f-983fb0d9babf.pdf` |

The attempted browser download was reported timed out/unverified. A matching named file was subsequently found in Downloads with an older modification time, then copied to the local drawing path and rendered by the coordinating review. **Unconfirmed:** whether that file resulted from the attempted download, or whether its bytes match the portal attachment. The local content and printed revision were visually verified; the printed revision matches the recorded catalog revision. Catalog status and dates do not establish installed precedence.

No source image was returned by the PIMS search for this page. This review relies on the local PDF/render, not a search description. No original-PDF hash or byte-match is claimed for another file.

## Explicitly depicted phase path

All locators below are PDF page 1. Arrows describe the drawing's connection order, not permitted operating direction or confirmed backfeed policy.

| Region | Depicted detail |
| --- | --- |
| A-B / 4-5 | `FROM 22kV RING MAIN UNIT RM410-SW03`, referring to `CB19OP001B-04057-DR-EL-0001`; TF410B labelled 22 kV / 415 V, 500 kVA, Dyn11. |
| C-D / 4-5 | Incoming phase conductor passes the device labelled `MC410A CB 630A` before reaching the horizontal phase bar. |
| D / 1-12 | MC410A phase bar labelled 415 V, 630 A, 63 kA for 1 second; sheet continuation is shown at the right. |
| C-D / 5-8 | Separate neutral bar, MEN link and earth bar; these are distinct from the phase route through the incoming breaker. |
| A / 10-12, notes box; outgoing branches D-G | Note 1 identifies dual safety-rated contactors for conveyor remote isolation. This outgoing-load note supplies no complete MC410A incoming-device interlock conditions. |

The first LV bus boundary is MC410A after its incoming breaker. Outgoing conveyors, motors, distribution boards, controls and further LV continuations are outside the agreed runtime boundary.

## Cross-source questions retained

- **TF410B433 V versus415 V:** the existing CV006/RM410 source-scoped transformer uses a 433 V description from the earlier reviewed source set; this supplemental page prints 415 V. Both are retained in the model caption/aliases and evidence. Which description governs the installed equipment remains **Unconfirmed**. No voltage calculation or revision-precedence rule is applied.
- **Upstream reference:** this page names RM410-SW03 and reference 0001. The existing RM410 model has its separate detailed source references. Their current installed identity/reference equivalence remains **Unconfirmed**; receipt of this page does not create a new input-identity merge.
- **MC410B and MEN context:** the original [CV006 source review](../areas/cv006-review.md) records MC410B as supplied from MC410A and retains the `MEN LINK REMOVED LOCATED IN MC410A` redline. The older MC410B material is retained as source evidence, not a runtime outgoing phase circuit or permanent phase-bus earth.
- **Transformer channels:** source-transfer/backfeed and earth continuity across TF410B remain **Unconfirmed**. Existing provisional source pairs and empty earth pairs with unknown winding coverage are retained. A neutral/MEN link does not establish a phase-earth pair.
- **States and interlocks:** complete installed position sets, physical interlocks, baseline positions and source availability remain **Unconfirmed**. Drawing poses and outgoing remote-isolation examples do not establish switching permission. The source does not confirm this.

Inference: the supplemental incoming path is attached to the existing source-scoped `rm410:interface:mc410a:input`, downstream of the existing TF410B candidate. Cross-document installed identity and precedence remain subject to owner review.

## Runtime construction delta

`withCv006Lv(base, version)` in `src/models/site/cv006-lv-extension.ts` clones the input model. It leaves the original area and historical `.4` package intact; the caller supplies a new immutable version.

| Change | Stable identity / treatment |
| --- | --- |
| Reused incoming interface | `rm410:interface:mc410a`, with only `rm410:interface:mc410a:input`; its former input-to-MC410B source/earth placeholder pairs are removed. |
| New incoming breaker | `rm410:mc410a:cb`, labelled MC410A CB / 630 A; actual state null; switching blocked by an explicit unresolved physical-interlock review. |
| New first LV bus | `rm410:mc410a:bus`, labelled 415 V / 630 A / 63 kA for 1 second; source/backfeed and earth coverage remain unconfirmed. |
| New phase connections | `cv006-lv:mc410a:incoming` and `cv006-lv:mc410a:bar`. |
| Removed outgoing runtime assets | `rm410:mc410b:cb` and `rm410:mc410b:bus`; associated starting state, interlock review, layout and navigation references are removed from the clone. |
| Removed outgoing connections / port | `rm410:mc410a-to-mc410b`, `rm410:mc410b:incomer-bus` and terminal `rm410:interface:mc410a:to-mc410b`; its obsolete coverage record is removed. |
| Detail and navigation | `supplemental/cv006-mc410a-lv`; upstream navigation to the RM410 HV detail and reverse navigation from the retained MC410A interface. |
| Evidence | `CV-MC410A-ENDPOINT`; original missing-detail, MC410B and MEN evidence identities/references remain traceable with revised scope descriptions. |
| Open reviews | `CV-MC410A-INSTALLED`, plus partial `CV-R06` and `CV-R11`. Receipt of 0002 revision6 is recorded; it is no longer described as an unavailable first-bus source. |

Construction stops for explicit review if a source is attached to the excluded MC410B circuit or a retained-device interlock depends on the removed equipment/source. It does not silently delete that source or weaken the retained-device rule. Rules targeting removed outgoing equipment are outside the retained runtime scope.

This extension records depicted endpoint detail and the agreed first LV boundary. It does not confirm the installed arrangement, accept a model version or establish an operating permission.
