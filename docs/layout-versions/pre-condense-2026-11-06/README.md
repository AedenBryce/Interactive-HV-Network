# Saved fallback — before condensation

Layout revision `authored-2026-11-06.2`, model `construction-2026-11-06.12`.

`reviewed-layout.json` is the exact export from the active owner Chrome tab. Its contents matched the shipped reviewed layout before this operation. `authored-network.json` is the corresponding drawing. `source.zip` holds the application source, dependency manifest/lock and build configuration. `built-app.zip` holds the built application. File hashes are recorded in `sha256.json`.

To restore this layout, copy `reviewed-layout.json` and `authored-network.json` from this folder into `src/models/site/`, rebuild the application, then reload the browser. Restore both files together: the layout revision isolates each version's browser saves. Export any newer edits before restoring.

The source and built application archives are retained separately so the pre-condense application can also be recovered if required. Extract archives into a separate directory when inspecting them; do not overwrite later work unintentionally.
