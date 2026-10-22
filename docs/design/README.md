# Simulation screen

The implementation reference is `simulation-concept.png`, generated with the built-in ImageGen tool on 22 October 2026. This is a design reference, not network evidence. The diagram and controls are implemented as SVG and HTML.

## Design system

- White header and inspector, cool grey rail and canvas, navy text (`#102640`).
- Teal source connectivity (`#009e91`), grey disconnected (`#929caa`), orange selection (`#f47735`). Text labels accompany colour.
- System sans serif: 24 px headings, 16 px main copy, 14 px supporting copy.
- Slim 56 px header, 228 px network rail, flexible central diagram, 300 px inspector, 36 px footer at desktop size.
- Fine grey borders, 8 px corners, no gradients or imagery in the application.
- Component families: network asset list, SVG equipment symbol, diagram surface, identity rows, state buttons, connectivity legend.
- On narrow screens the rail becomes a compact list and the inspector stacks below the diagram. All equipment remains reachable by keyboard.

## Initial copy and behaviour

HV Network; Local simulation; Network model; Synthetic network; fixture-1.0; Demonstration model. Not the site network.; Single-line diagram; Source A; CB-01; TF-01; LV bus; Asset details; Circuit breaker; Identity; State; Source connectivity; Connected; No source connection; Set intended state; Open; Close; Changing this breaker updates the downstream path.; Connectivity model only · No electrical calculations.

The selected breaker starts closed. Open disconnects the represented downstream transformer and LV bus from Source A; Close restores them. No control may be decorative or implement separate electrical rules.

## Generation brief

Full desktop engineering browser application, 1440 × 900 target: slim header; left synthetic-model rail and four-asset list; central single-line source → breaker → transformer → LV bus diagram; right selected-breaker identity, state and connectivity inspector; Open and Close controls; legend and scope footer. White/cool grey/navy/teal/orange palette, generous spacing, crisp system typography. No marketing hero, invented metrics, unrelated controls or safety claims. Code-native diagram and HTML controls in the implementation.
