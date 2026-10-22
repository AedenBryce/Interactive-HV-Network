# Interactive HV Network

A local browser application for understanding represented network connections and downstream switching impacts.

**Current models: synthetic demonstrations only.** The site network has not been implemented or accepted. Source drawings are being reviewed separately. The application reports connectivity, without electrical calculations or operational isolation authorisation.

## Run locally

Prerequisites: Node.js 24 and pnpm 11. The dependency lockfile records the installed versions.

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173/`.

Select CB-01 on the diagram or in the asset list. Choose **Open**, then select **LV bus**: its source connectivity becomes **No source connection**. Close CB-01 to restore the represented connection. Selection also works with Tab and Enter. These fixture positions are fictional software examples, not installed-equipment evidence.

Use **Demonstration model** to explore additional examples. Changing demonstration model starts its configuration again.

- **Synthetic alternate supplies:** open CB-01 and inspect the LV bus. Source B supplies it through the bus tie or loop link. Select a source-path explanation to highlight it. Select Source B to disable its availability; device positions are retained. Inspect **Last action impacts** for changes to connectivity and routes. The listed paths are examples; the route-change calculation also accounts for alternate paths that are not the displayed example.
- **Synthetic earth connections:** open CB-01, close ES-01 and inspect the LV bus. Its earth connection is shown independently of its source connection. Closing CB-01 while ES-01 remains closed reports a source-to-earth conflict. This fictional fixture does not define a prohibiting interlock. The separate LV bus does not receive a source through a shared earth group.

- **Synthetic physical interlocks:** ES-01 cannot close until CB-01 is open. CB-01 cannot close while ES-01 is closed. ES-02 has unresolved fictional interlocks and its controls remain disabled. Inspect the interlock explanation beside the controls.
- **Synthetic unconfirmed connections:** inspect the candidate LV supply and its linked evidence/review questions. Source B availability is unknown; the main LV bus retains its established Source A path while earth and off-page information remain unconfirmed.
- **Synthetic positions and windings:** set the device to Isolated and inspect LV bus A. Disable both fictional sources before selecting Earthed. Inspect the transformer's explicitly declared source-transfer and earth-continuity relationships. LV bus B has no transfer represented in this fixture.

Use the diagram's overview/detail buttons and cross-view connection links to navigate. Drag or use the pan controls; zoom with the buttons or use **Fit view**. Focus the diagram for arrow keys, +/− and Home. Navigation does not change the electrical scenario.

The development server binds to the local machine. There is no backend, account, external API or PDF dependency in the application.

## History and scenario files

Use **Undo last action** to restore the preceding accepted device/source states. **Reset network** restores the recorded baseline and clears history. Blocked changes add no history.

**Save scenario** downloads JSON containing the original model, diagram and selected states. **Open scenario** validates that file before replacing the active scenario. A matching model identity/version can be explored. A different identity/version opens its original snapshot as **View only**, with switching, source changes, undo and reset disabled. Navigation, inspection and tracing remain available. **Start current model** returns to the current model's baseline.

A changed model package requires a new version, including changes to topology, equipment identities, relationships, interlocks, baseline, evidence or diagram organisation. Files with changed content claiming a previously loaded identity/version are rejected. PDFs and separate historical model files are not required to reopen scenarios.

## Development checks

```powershell
pnpm typecheck
pnpm test:session
pnpm build
pnpm preview
```

Session tests exercise the approved application-facing boundary: load model, perform switching actions and observe results. The tests do not inspect traversal internals. `pnpm test` runs the full test suite.

## Project records

- [Specification](docs/specs/interactive-hv-network.md)
- [Published implementation tickets](docs/tickets/README.md)
- [Implementation progress](docs/implementation-progress.md)
- [Domain vocabulary](CONTEXT.md)
- [Tooling and architecture](docs/adr/0001-local-application-and-session.md)
- [Drawing review queue](drawing-review/review-queue.md)

Raw drawings remain local and are excluded from Git. A real model and its starting configuration require evidence review and explicit owner acceptance against a model version.
