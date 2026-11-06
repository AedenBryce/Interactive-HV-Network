# Breaker removability review

Reviewed 23 October 2026 against `site-whole-network` / `construction-2026-10-23.1`, code `f5beb4b`. This review classifies mechanisms for the educational model; it does not accept installed hardware, starting states, physical interlocks or the whole network.

## Coverage and decisions

The [asset register](removable-breakers-audit.json) contains exactly the 157 breaker-kind asset IDs in that package, with no duplicates or omitted IDs. Sixty have a depicted withdrawable symbol and explicit legend on the same page. Fifty-four detailed LV/hopper MV cases use the plug/contact categories selected in owner answer35. Five retained station/water HV breakers are explicitly selected in answer38. This makes **119 selected removable breakers**. The remaining **38 mechanisms are Unconfirmed**; none is classified fixed by default.

Each row preserves its source classification, filename, revision, page, region, source-review limitations and model-eligibility basis. The original source interpretation remains visible when the owner's model selection supplies the classification. Question26 requires racking actions for drawing-shown removable breakers; answers35 and38 provide the later category/device selections. See the [exact owner decision record](owner-configuration-review.md).

The two initial source groups covered 77 and79 breaker assets. An exact ID comparison against the current package identified the omitted 157th asset, `line33:pole-1-recloser`. Its source, `CB21OP055B-10016-DR-EL-0089.pdf`, rev0 (10 June2022), p1 C/3 and legend B/11, identifies a recloser but does not identify fixed, removable, withdrawable or racking construction. **The source does not confirm this.** Its mechanism remains Unconfirmed.

## Baseline and controls remain separate

The three individually confirmed tie breakers are SW411 BT, CB SW435 FD02 at SW431 and CB SW431 FD02 at SW435. Their selected starting contacts are Open and racking is Rack out. Other explicitly identified loop-feed cases require individual owner confirmation under answer30; this audit does not equate every path in a graph cycle with that designation.

Removability alone does not resolve physical interlocks. Answer37 selects the local action matrix only for SW411 incoming/outgoing line-earth pairs, excluding its two bus-earth switches. Other switchgear families require their own source/owner rule review. A generic CB/recloser symbol does not establish a fixed mechanism or an unrestricted action.

The register's capture paths refer to local working images used during the visual audit. The original PDF provenance remains in the drawing intake and cited source records. Runtime models must embed the relevant references and decisions; they must not require those working images or PDFs.
