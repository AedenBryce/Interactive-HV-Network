# ADR 0006: Session history and model presentation

Date: 22 October 2026. Status: implemented for GitHub #8; scenario integration in progress.

## Decision

Keep accepted device/source actions and complete preceding states inside the simulation session. Blocked requests and permitted no-op requests add no history. Undo restores the preceding states, including explicit unknown values, and recomputes connectivity and impacts. Reset restores the model's starting devices and source availability, clears history and recomputes results. Loading a valid model clears history; rejected input preserves the complete active session.

Carry diagram organisation in the versioned model snapshot, separately from electrical relationships. Validate view identities, visible assets, terminal coordinates and cross-view references before replacing the session. Every represented asset must appear in a view. Coordinates never create an electrical connection.

The application uses the viewed snapshot's diagram organisation. A deterministic fallback arranges existing identities for a valid model with no supplied presentation. It creates coordinates only. Historical diagrams must not rely on the current demonstration registry or PDFs.
