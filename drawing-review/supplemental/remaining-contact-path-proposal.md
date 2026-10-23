# Remaining contact and LV AC path proposal

**Owner95/96 each answered “approved” on23October2026.** The exact original proposal below and its JSON inventory are retained unchanged. Scope and limitations are recorded in [the decision record](owner-contact-path-decisions.md).

Prepared against immutable `site-whole-network / construction-2026-10-23.8`. This is a proposal, not an owner decision or a claim that equipment has been field-verified. Exact original terminal IDs and source references are in [the frozen inventory](remaining-contact-path-proposal.json).

## Question95 —24 binary contact matrices

For these exact controls, select Open = no contact pair; Closed = the listed two owned terminals joined for modeled source and earth continuity. This establishes only internal contact behavior. Preserve actual equipment/installed metadata as Unconfirmed, starting positions, local action/racking rules, external connection knowledge and independent transformer/earthing behavior. No source, earth termination or external cable is invented.

| Control | Model identity | Closed pair |
| --- | --- | --- |
| ES SW435 FD 02 | `sw431:sw435:es` | `sw431:sw435:es:a` ↔ `sw431:sw435:es:b` |
| ES TF453 FD | `sw435:tf453:hv-es` | `sw435:tf453:hv-es:a` ↔ `sw435:tf453:hv-es:b` |
| HPGR MCC incoming MCCB · tag unconfirmed | `hpgr:mc001:cb` | `hpgr:mc001:cb:a` ↔ `hpgr:mc001:cb:b` |
| ES SS714 FD | `sw426:ss714:es` | `sw426:ss714:es:a` ↔ `sw426:ss714:es:b` |
| SF RM714 IN01 | `rm714:in01` | `rm714:in01:a` ↔ `rm714:in01:b` |
| SF RM714 IN02 | `rm714:in02` | `rm714:in02:a` ↔ `rm714:in02:b` |
| RM714 IN01 earth · presence owner-confirmed; path review pending | `rm714:in01:es` | `rm714:in01:es:a` ↔ `rm714:in01:es:b` |
| RM714 IN02 earth · presence owner-confirmed; path review pending | `rm714:in02:es` | `rm714:in02:es:a` ↔ `rm714:in02:es:b` |
| CB TF714 FD | `rm714:tf714:cb` | `rm714:tf714:cb:a` ↔ `rm714:tf714:cb:b` |
| TF714 feeder earth · presence owner-confirmed; path review pending | `rm714:tf714:es` | `rm714:tf714:es:a` ↔ `rm714:tf714:es:b` |
| ES SWXXX / ES SW505 Bus earth · tag unconfirmed | `sw505:bus:es` | `sw505:bus:es:a` ↔ `sw505:bus:es:b` |
| VS4061 Input A · 2500 A | `rm406:vs4061:input-a:switch` | `rm406:vs4061:input-a:switch:a` ↔ `rm406:vs4061:input-a:switch:b` |
| VS4061 Input B · 2500 A | `rm406:vs4061:input-b:switch` | `rm406:vs4061:input-b:switch:a` ↔ `rm406:vs4061:input-b:switch:b` |
| VS4101 Input A · 2500 A | `rm410:vs4101:input-a:switch` | `rm410:vs4101:input-a:switch:a` ↔ `rm410:vs4101:input-a:switch:b` |
| VS4101 Input B · 2500 A | `rm410:vs4101:input-b:switch` | `rm410:vs4101:input-b:switch:a` ↔ `rm410:vs4101:input-b:switch:b` |
| RM418 ES01 · unconfirmed | `wh:h7:rm418:sw01:es` | `wh:h7:rm418:sw01:es:a` ↔ `wh:h7:rm418:sw01:es:b` |
| SF RM712 IN02 | `rm712:in02` | `rm712:in02:a` ↔ `rm712:in02:b` |
| SF RM712 IN01 | `rm712:in01` | `rm712:in01:a` ↔ `rm712:in01:b` |
| SF RM713 IN01 | `rm713:in01` | `rm713:in01:a` ↔ `rm713:in01:b` |
| SF RM713 IN02 | `rm713:in02` | `rm713:in02:a` ↔ `rm713:in02:b` |
| S102 Separate fixed switch below Q100 | `rm412:feeder-contact` | `rm412:feeder-contact:a` ↔ `rm412:feeder-contact:b` |
| TF413A AC input A 2500 A | `rm413a:ac-input-a:switch` | `rm413a:ac-input-a:switch:a` ↔ `rm413a:ac-input-a:switch:b` |
| TF413A AC input B 2500 A | `rm413a:ac-input-b:switch` | `rm413a:ac-input-b:switch:a` ↔ `rm413a:ac-input-b:switch:b` |
| WT1-CB · study recloser | `mine:wt1:cb` | `mine:wt1:cb:a` ↔ `mine:wt1:cb:b` |

This list excludes the16 RMU selectors, RM413A lower selector (questions93/94) and the two already selected HPGR outlets. Existing local action approval and this internal electrical contact selection remain separate records.

## Question96 —12 LV AC connections

Select the exact matching transformer-winding → input-switch and input-switch → AC-endpoint wire relationships below as continuous source/earth cable connections in V1. This establishes only these12 drawn routes; it adds no common AC bus, connection between windings, converter/DC/motor transfer or transformer phase-earth path. Parent metadata and actual voltage/rating/installed claims remain separate.

| Existing wire | From | To |
| --- | --- | --- |
| `rm406:vs4061:input-a:winding-cable` | `rm406:tf406a:lv-a` | `rm406:vs4061:input-a:switch:a` |
| `rm406:vs4061:input-a:switch-boundary` | `rm406:vs4061:input-a:switch:b` | `rm406:vs4061:input-a:boundary:port` |
| `rm406:vs4061:input-b:winding-cable` | `rm406:tf406a:lv-b` | `rm406:vs4061:input-b:switch:a` |
| `rm406:vs4061:input-b:switch-boundary` | `rm406:vs4061:input-b:switch:b` | `rm406:vs4061:input-b:boundary:port` |
| `rm410:vs4101:input-a:winding-cable` | `rm410:tf410a:lv-a` | `rm410:vs4101:input-a:switch:a` |
| `rm410:vs4101:input-a:switch-boundary` | `rm410:vs4101:input-a:switch:b` | `rm410:vs4101:input-a:boundary:port` |
| `rm410:vs4101:input-b:winding-cable` | `rm410:tf410a:lv-b` | `rm410:vs4101:input-b:switch:a` |
| `rm410:vs4101:input-b:switch-boundary` | `rm410:vs4101:input-b:switch:b` | `rm410:vs4101:input-b:boundary:port` |
| `rm413a:ac-input-a:winding-cable` | `rm413a:tf413a:lv-a` | `rm413a:ac-input-a:switch:a` |
| `rm413a:ac-input-a:switch-boundary` | `rm413a:ac-input-a:switch:b` | `rm413a:ac-input-a:boundary:port` |
| `rm413a:ac-input-b:winding-cable` | `rm413a:tf413a:lv-b` | `rm413a:ac-input-b:switch:a` |
| `rm413a:ac-input-b:switch-boundary` | `rm413a:ac-input-b:switch:b` | `rm413a:ac-input-b:boundary:port` |

References: `CB19OP001B-04057-DR-EL-0001.pdf`,rev6,p1 D–F/1–3 and9–11; related RM406/RM410 detailed sheets; `CB17OP023A-04057-DR-EL-0004.pdf`,rev5,p1 D–E/4–8. Exact per-row documents/revisions/pages/regions are preserved in the frozen inventory. Owner92 separately selects these six endpoints and excludes LV converter/DC/motor detail. No continuity is inferred from scope approval alone.
