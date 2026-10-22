# Remaining HPGR and RM412 mechanism questions

Read-only review of committed2398a2c and existing source-review captures,23October2026. These are construction associations and drawing references, not physical action permissions. Owner49 defers only the named key/door/inching sequences. Complete local profiles remain **Unconfirmed**.

## HPGR — P10

Source: `CB112-02006-DR-EL-0005.pdf`, rev7, p1. SW435 feeding assembly also references `11098-07110-EL-DR-2354.pdf`, rev9, p1 C–G/8–9.

| Model control | Depicted/model association | Drawing region |
| --- | --- | --- |
| SW435 HPGR CB/ES | Existing removable CB; separate cable-side earth | A–C/2–3 |
| SW002 A01 Q8 | Incoming earth branch at TF001 secondary/common bar; no inline local incomer control represented | A–C/4 |
| A02 K101/Q8 | Binary main contact and TF003 cable-side earth | A–C/6 |
| A04 K101/Q8 | Binary main contact and TF002 cable-side earth | A–C/9 |
| TF004 K202/Q8 | Main before F101; earth branch after F101 on transformer side | A–C/7–8 |
| MEB/MEA DC earths | Separate modeled converter DC-terminal branches | D–E/5–6 and D–E/9 |

K101/K202 are printed tags. Their current binary disconnector representation does not confirm installed device type, removability or combined mechanism. The central feeder bay is printed “A01 TE004 FEEDER” on0005, while `CB-10016-DR-EL-0010.pdf`, rev0, p1 SW002 panel uses A03/TF004. Retain the construction ID `tf004`; canonical bay identity remains Unconfirmed. Descriptive DC-earth IDs are not verified printed equipment tags.

Needed owner input: K101/K202 device types/racking and independent versus combined Q8 operation; complete SW435 CB/ES local matrix; A01 earth prerequisites; three main/earth profiles; two DC-earth profiles and exact controlling source/contact/outlet prerequisites. Converter coupling must not be invented to derive these rules. The source does not confirm this. Supplemental `CB112-02006-DR-EL-0008`, rev4, indexed p1, records control/alarm/trip terminations; original PDF is unavailable and it does not establish the complete local truth table.

## RM412 — P19

Source: `CBC0012-02004-DR-EL-0007.pdf`, rev9, p1 F–G/1–3 (inverted letter-grid orientation).

S100/E100 and S101/E101 are modeled as separate binary main/earth controls. Both earth branches attach to the common-bar side, rather than independent incoming cable sides. Q100 feeds a provisional unnamed disconnecting contact, followed by E102 on the transformer side. The unnamed contact is in F/1–3.

**Inference:** the retained S100/E100 and S101/E101 blade arrangements suggest combined main/earth selectors. This does not confirm a selected Service/Isolated/Earthed mechanism. **Inference:** the dashed triangle/linkage suggests a mechanical association between the unnamed contact and E102. Its meaning and action conditions remain Unconfirmed. The source does not confirm this.

Needed owner input: incoming mechanism types and transition sequence; unnamed contact identity and whether it is separate isolation or withdrawal; prerequisites for both common-bar earths and E102; Q100/contact rules and any additional non-deferred local restrictions. Do not copy a neighboring-switch-only Earth Close condition onto these common-bar earths.
