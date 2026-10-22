# ADR 0007: Self-contained scenarios and historical viewing

Date: 22 October 2026. Status: implemented locally for GitHub #10 and #11.

## Decision

Save format-version 1 JSON containing the full original model snapshot, its version, selected device states and source availability. The model includes diagram organisation, evidence, review records, interlocks and explicit equipment relationships. Action history is not persisted.

Validate the complete envelope, embedded model, presentation and exact state identities before replacing the active session. Failed parsing or validation preserves the session. A claimed model version must match the embedded version.

Treat the combination of model identity and version as an immutable package. Canonically compare complete content, ignoring object-key order. Reject different content claiming a previously seen identity/version. Changes to topology, identities, relationships, interlocks, baseline, evidence or presentation require a new model version. No migration is attempted.

Compare the saved identity/version with the current model. A match opens for exploration. A mismatch opens the saved original model in view-only mode, retaining current-model metadata separately. Device/source actions, undo and reset are gated in the session and disabled in the UI. Inspection, path tracing, pan/zoom, navigation and saving remain available. Starting the current model exits the historical view and restores its baseline.

## Limit

The immutable-package comparison covers packages known to the current session. It does not authenticate a scenario's author or independently establish installed-network correctness. Model acceptance remains a separate owner decision against a version.
