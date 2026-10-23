# Local delivery verification

## Current evidence

Verified23October2026 against immutable `construction-2026-10-23.10`, implementation57a2ee9. The current whole-model review is pending; the owner's guided walkthrough choice and unconfirmed Section1 are recorded in [the walkthrough](v10-walkthrough.md).

The isolated `tmp/delivery-v10` folder contains only these production files, served locally at127.0.0.1:4174:

| File | Bytes | SHA256 |
| --- | ---: | --- |
| index.html |466| B22E97A498646394121959BB358F2C3742A5B5427E9F32468B5B4DC4A4E22B00 |
| assets/index-D-Oih6Pk.css |13,126| D6A60C468404369FC4ABFE7A254A7DF0248B4F09E2291849CF346C0E142ABC05 |
| assets/index-BdyJkv-T.js |1,763,805| A6195D789A859531CA6772F1243233F1CCF6829BE0D82447BE1A4D68EA8357E1 |

Current browser evidence is recorded in [implementation progress](implementation-progress.md): startup without PDFs/repository sources, laboratory LV supply interruption and racking guards, Undo/Reset, actual matching `.10` restore, and original `.9` view-only restore with Undo/Reset disabled. Browser warning/error entries were empty. The live server handle was polled again after the walkthrough began: it remains running; its request log contains successful HTML,CSS,JavaScript requests and favicon404, with no PDF or model-file request.

The local review archive `output/hv-network-v10-review.zip` is797,511bytes, SHA256 `5520826AF4D6E6D5FB8902B22789D38005286E700B8156E45AE36B7EF70C00BA`. It contains the same three production files under `www/`, the actual self-contained `.10` baseline scenario, standalone startup/review instructions and a per-file SHA256 manifest. ZIP integrity and every manifest payload hash were checked. The scenario fingerprint remains `D9F5EE5DF69AC5A3FE8846AF215F4D1FEA651B9B2881F7655707490A3DE4436D` (8,382,404bytes). Python3.12.10 is installed on the preparation PC; instructions serve the extracted `www` folder on loopback port4186 with Python's standard HTTP server. Those packaged files match the isolated build already exercised; the extracted archive itself has not been launched separately.

This is a **review copy**, not accepted final delivery. Full-suite verification, complete walkthrough, explicit immutable-version acceptance and final ticket closure remain pending. No model or acceptance status was rewritten while packaging. Narrow/mobile remains unverified.

## Historical .5 evidence

Verified on 23 October 2026 against construction `construction-2026-10-23.5`, code commit `6b76046`. Whole-model acceptance remains pending under tickets [#25](https://github.com/AedenBryce/Interactive-HV-Network/issues/25) and [#26](https://github.com/AedenBryce/Interactive-HV-Network/issues/26).

An isolated directory, `tmp/pdf-free-check-20261023`, contained only these production files:

| File | Bytes | SHA256 |
| --- | ---: | --- |
| index.html | 466 | E2CDDBFEB95C875D76C6807A7C4495F06AEAA78061F98B10573239B23AF308B7 |
| assets/index-D-Oih6Pk.css | 13,126 | D6A60C468404369FC4ABFE7A254A7DF0248B4F09E2291849CF346C0E142ABC05 |
| assets/index-DYYZdack.js | 1,594,542 | 39BCFFC613A2B1F2194CEB8CC8FDB74C184F70C8F7EE0F9C6ED9C802E9D102E8 |

There were no PDFs, model JSON files or separate historical-model files in that directory. A temporary HTTP server served it at local port4185 and has been stopped.

Browser checks completed:

- Application startup and selection of the whole `.5` construction.
- Reopening the actual self-contained `.4` scenario as view-only against `.5`, with Undo and Reset disabled.
- Reopening the matching `.5` scenario, opening CB SW411 IN03, and using Undo to restore Closed/Rack in.
- No browser warnings or errors recorded. HTTP requests comprised successful HTML, JavaScript and CSS requests, plus favicon404; no PDF or separate model JSON request occurred.

These observations confirm those tested runtime operations work from the three-file production package. They do not establish acceptance of the construction network. Evidence image: `hv-pdf-free-runtime.png`, captured in the task visualization folder during this check.

## Remaining delivery gates

Complete agreed network coverage and discrepancy review, select a final immutable model, obtain whole-model acceptance, and repeat delivery checks against that accepted package. The full test suite remains reserved for the end of the whole goal. Current focused verification does not close tickets25 or26.
