# Interactive HV Network

A local browser application for understanding represented network connections and downstream switching impacts.

**Current model: synthetic demonstration only.** The site network has not been implemented or accepted. Source drawings are being reviewed separately. The application reports connectivity, without electrical calculations or operational isolation authorisation.

## Run locally

Prerequisites: Node.js 24 and pnpm 11. The dependency lockfile records the installed versions.

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173/`.

Select CB-01 on the diagram or in the asset list. Choose **Open**, then select **LV bus**: its source connectivity becomes **No source connection**. Close CB-01 to restore the represented connection. Selection also works with Tab and Enter. These fixture positions are fictional software examples, not installed-equipment evidence.

The development server binds to the local machine. There is no backend, account, external API or PDF dependency in the application.

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
