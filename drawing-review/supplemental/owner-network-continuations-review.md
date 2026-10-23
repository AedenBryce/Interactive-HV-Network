# Owner network continuation decisions

Date:23 October2026. These decisions concern the represented extent and external cable connections. They do not select contact positions, mechanisms, earth coverage, local action profiles or whole-model acceptance.

## Answer83 — include Drop Tower through its LV bus

Exact answer: **“Include through its final LV bus”** to the Drop Tower LV Workshop branch scope question. The branch is in scope. No transformer identity, board identity or installed routing was supplied in this answer.

Sources checked:

- `CB19OP001B-04057-DR-EL-0001.pdf`, rev6 (28 January2025, AS FOUND23 October2023), p1 A–B/8–10: a branch from pole17 through pole17-1, labelled DROP TOWER LV WORKSHOP. It does not depict the transformer or final LV bus.
- `CB-10016-DR-EL-0003.004.pdf`, rev0 (2 May2018, AS BUILT), p1 C–E/5: P18 takeoff → P18-1 ABS → P18-2 → P18-8 10A FUSE ABS → P18-8 TF,22kV/400V,315kVA →400A symbol/LV cable → DROP TOWER CHANGEOVER SWITCHBOARD. The whole page and a rotated detailed crop were inspected. No board internal switching, alternate incoming supply or final bus contact arrangement is shown.

**Unconfirmed:** equivalence between pole17/17-1 and the older P18 branch, current transformer/board identities, present connections and the board's internal arrangement. The source does not confirm these. Questions86–87 ask the owner for the present route and LV entry/alternate supply. No electrical join or new switching permission is inferred from answer83 alone. PIMS searches did not supply an independent detailed board sheet.

### Answer86 — current branch identity

Exact answer: **“yes”** to the complete question: is the CV006 pole17/17-1 branch the same branch shown as P18 → P18-1 ABS → P18-8 fused ABS → P18-8 TF (22kV/400V,315kVA) → Drop Tower Changeover Switchboard? This resolves the named route comparison. Both naming schemes remain traceable; no other pole identity is changed. Board internals, local actions and final model extent require separate decisions.

### Answer87 — revised V1 cut at transformer

Exact answer: **“not relevant. just have the final point be the Drop tower Transformer for V1”**. This supersedes83's downstream extent: include the confirmed HV route and transformer, ending at the transformer. Do not add the LV cable, fuse, changeover board, internal devices or final LV bus. This is an explicit exception to the usual final-LV-bus boundary; no absence of excluded alternate supplies is asserted.

### Answers88/89 — HV controls and fuse continuity

Answer88 exact: **“correct”** to the full two-control teaching proposal: P18-1 ABS and P18-8 fused ABS initially Closed; fixed Open/Close only, no racking; no additional local/key prerequisites; fused-ABS fuse intact without blown-fuse/removal actions. The fuse's selected source continuity is separate from actual condition and independent earth behavior. The inherited owner25/28 primary→secondary model policy applies to the explicitly identified transformer; reverse/earth behavior remains Unconfirmed.

Answer89 exact: **“yes”** to intact fixed continuity for the depicted400A LV fuse, without switching/removal actions or acceptance of actual condition/earth continuity. That fuse is beyond the transformer cut selected in87, so89 is recorded without adding the excluded LV fuse or extending the V1 boundary.

## Answer84 — RM713 IN02 and RM714 IN02

Question84 explicitly named both controls and asked what is currently connected externally to each. Exact shared answer: **“no cable connected”**. This confirms no external cable at both named cable-side terminals. It does not mean either installed control or its associated earth switch is absent; existing selected baselines and local profiles remain unchanged.

Source references retained: `11098-07110-EL-DR-2254.pdf`, rev1,p1 A–C/2–3; `11098-07110-EL-DR-2255.pdf`, rev1,p1 A–C/1–3. Their unnamed continuation markers are historical drawing references after this decision, without active stub connections. No external source continuation is required at the two actual terminals. Earth coverage remains Unconfirmed independently.

## Answer85 — RM417 SW02

Exact answer: **“nothing is connected”** to the current external cable-side connection question for Hopper1 RM417 SW02. This confirms no external cable at the SW02 line terminal. Retain the installed three-position switch, bus-side connection, earth termination, Service baseline and selected local profile.

Source: `CB16OP038A-02006-DR-EL-0044.pdf`, rev2,p1 A–C/3–9. Its unnamed continuation marker remains a disconnected drawing reference. External source continuation at the actual line terminal is complete within this scoped decision; independent earth coverage remains Unconfirmed.
