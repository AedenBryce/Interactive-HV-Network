# Deliver a stable, reviewable HV network schematic

## Outcome

Deliver one complete, legible, interactive, top-down single-line overview of the existing network. Use authored switchroom and subassembly layouts, explicit overall positions, and reserved external cable corridors. Preserve the network model and the owner's accumulated confirmations. The output is a working local application ready for the owner's visual review and corrections.

The last saved audit records 684 assets, 677 connections, and 29 room frames. Establish the exact current ID and terminal sets at the start; counts alone do not establish preservation.

## Fixed scope and decisions

- Keep the existing educational simulation, switching rules, confirmed baselines, model knowledge, evidence, and scenario behavior. Change only what is necessary for layout, rendering, navigation, and a working build.
- Display the complete network on one continuous canvas. Retain search-to-asset, pointer-centred wheel zoom, drag pan, fit-to-network, asset action popups, and a minimisable details panel. Equipment and labels must remain aligned and available across zoom levels.
- Flow from supplies at the top to downstream equipment below. Stagger switchrooms to use height and width sensibly. Group related equipment inside non-overlapping room frames with identifiers inside the frames.
- Place the complete connected SB02 F4/TF04 to RM420 33 kV branch in a separate outer top-down column, as confirmed by the owner. Preserve its branch-point markers and every modeled connection.
- Preserve standard equipment symbols, the agreed earth-switch drawing convention, solid horizontal/vertical connector lines, clear asset labels, dark styling, bright green source-connected lines, and red lines without source connectivity.
- Inter-substation ring-feed crossings are acceptable when clearly shown as crossings rather than electrical junctions. Minimise unnecessary crossings and long detours; zero crossings is not a completion requirement.
- On 5 November the owner selected delivery of the current version for manual review, explicitly accepting the version presented with 65 gap-separated feeder crossings and 9 ring crossings. Subsequent validated corrections reduced the feeder crossings to 25. Preserve the visible separation; further visual refinements belong to the owner's review.
- Author positions in project layout data. A user-facing manual diagram editor is outside scope. Layout work must not require the owner to reconfirm established electrical relationships.

## Required architecture

Follow ADR 0012 through a single production layout path.

1. Assign every asset exactly one presentation owner: a switchroom or an explicit unframed assembly. Electrical graph traversal must not determine which unrelated assets move with a room. Shared junctions have one owner and explicit ports.
2. Build room interiors in stable local coordinates using reusable equipment arrangements. Geometry measurements, terminal locations, labels, busbars and collision bounds must use the same definitions as the renderer. Reuse usable existing presentation geometry after checking it.
3. Store global room positions, sibling order, intended adjacency, named external ports and cable corridors as explicit layout data. Use the confirmed network for connections; layout decisions never establish electrical facts.
4. Compose local geometry using one transform per room. Moving a room changes that transform and its incident external routes; other room interiors stay fixed. Reserve space for corridors before routing.
5. Generate and validate complete, versioned geometry when the model or layout changes. Load the accepted geometry directly in the application. The normal page-load path must not run the legacy global search before reading saved geometry. Switching changes state and appearance without changing layout.

Replace the legacy correction sequence at its integration seam. Do not add another production chain of asset-specific offsets, recursive descendant translations, competing layout strategies, or global rerouting after a local placement fix.

## Delivery checkpoints

### 1. Establish one baseline and geometry contract

Preserve existing working-tree changes in a recoverable snapshot before restructuring. Record the source revision or content fingerprint, network topology fingerprint, exact asset IDs, connection IDs and endpoint-terminal pairs. Identify production files and isolate failed layout experiments from normal build/test discovery without deleting unrelated work. Define exclusive presentation ownership and the local-to-global geometry contract.

### 2. Establish the complete composition

Author the placement of all room/source/line groups with measured dimensions, external ports and corridors. Resolve ownership and representative internal arrangements before expansion. Use the existing symbols and renderer. Check the full composition plus a dense switchroom and a ring connection. An intermediate placement preview is not a completed product.

### 3. Complete and integrate the drawing

Populate every group, route every actual connection, and load the resulting geometry directly in the existing application. Use one production layout and one authoritative review URL. Produce a complete browser-visible overview before further cosmetic optimisation. Concentrate corrections on demonstrated symbol/label collisions, ambiguous wires, detached endpoints, and poor hierarchy.

### 4. Verify and deliver

Compare exact asset IDs and connection endpoint pairs with the frozen model. Validate orthogonality, equipment and label footprints, busbars, terminal attachment, group ownership, frame overlap, and misleading wire contacts. Allow intentional bus/junction sharing, explicitly classified ring crossings and the owner's accepted gap-separated feeder crossings. Separate intended room entry from lines crossing unrelated room interiors.

Run the application and inspect the full overview, dense rooms, long feeders, the TF04/RM420 column and ring feeds at useful zoom levels. Exercise search, selection/actions, zoom, pan, fit and details minimisation. Confirm layout stability across switching and reload. Run the production build and focused checks appropriate to the changed integration.

Deliver the working URL, a full overview image, representative detailed images, preservation evidence, and a short list of accepted crossings or remaining non-blocking visual limitations. Do not claim completion while there are missing assets/routes, incorrect endpoints, lines through unrelated equipment/labels/busbars, ambiguous electrical joins, overlapping room frames, or broken required controls. Owner acceptance of electrical correctness remains a separate review.

## Controls against drift

- Maintain `docs/goals/hv-layout-progress.md` as the short execution record: baseline fingerprints, current checkpoint, accepted decisions, current production path and preview URL, completed verification, remaining concrete defects, and the next action. Read it when resuming or after context compaction.
- Use one integrator for production composition. Delegate room interiors, global placement/external routes, and independent visual/geometry review through explicit interfaces and exclusive file ownership. Agents must not independently promote competing layouts or edit the same production file simultaneously.
- Use a fixed baseline for every comparison. Record hard collisions as well as crossings. A lower crossing count cannot justify new symbol, label, busbar, endpoint, or ownership defects.
- Use focused checks while editing one group; perform a complete audit at an integration checkpoint or when a shared change justifies it. Reuse unchanged results and avoid repeated full-network searches or unrelated prototypes in routine audits.
- After two failed attempts at the same concrete defect, stop that approach, report the cause, and fix the ownership/measurement/port contract responsible. Do not start another general-purpose layout-algorithm trial or add another compensating offset.
- Stay within this layout delivery scope. Stop after delivering a reviewable product that meets the checks above; further owner-requested visual changes can be handled as scoped follow-ups.
