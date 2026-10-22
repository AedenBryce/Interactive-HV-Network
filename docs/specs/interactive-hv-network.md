## Problem Statement

People working on the HV network need to understand how device states affect the connections and supply paths available to other equipment. The network is documented across PDF drawings of differing detail, with discrepancies that need the project owner's confirmation. Reading those drawings individually does not provide an interactive way to explore the consequences of switching, alternate supplies, or earth connections.

The project owner wants an application that represents the whole network through its final LV bus endpoints and lets users explore those relationships. The current project is for understanding and scenario exploration; developing an operational isolation tool is outside its scope.

## Solution

Build a local browser application displaying a connected single-line diagram, a network overview, and detailed substation views. Users select an asset, inspect its identity and state, and change supported device states or source availability. The application updates source connectivity and earth connectivity independently, highlights affected assets and paths, explains alternate supply paths, and identifies source-to-earth conflicts. It performs no electrical calculations.

Construct the network model together with the owner using the supplied PDFs. Provisional interpretations remain explicitly unconfirmed while discrepancies are accumulated and resolved step by step. Enforce physical interlocks established by the drawings and owner review; disable affected switching controls while interlock conditions remain unresolved. Once established, the model operates without requiring the original PDFs. There is no network editor in V1.

Sessions start from the agreed starting configuration and support undo and reset. Users can save and share scenario files containing their device states, source availability, model version, and complete original model snapshot. Scenarios whose model version differs from the current model open using their original snapshot in view-only mode, retaining navigation, inspection, and path tracing.

V1 acceptance requires the whole network and the owner's model acceptance. Incremental implementation does not reduce that scope.

## Owner scope amendment — 22 October 2026

The owner narrowed the station coverage after reviewing the proposed village connection:

> Not relevant for the scope of this tool. The only feeders from SB01 and SB02 that are required are the ones from TF11, TF12 and TF-04. That should be the battery limits.

The owner then selected this exact upstream cut:

> At its SB01/SB02 feeder breaker, retaining that feeder and transformer but excluding station buses, generators and other feeders

Retain SB01 F4 / TF11, SB02 F1 / TF12 and SB02 F4 / western TF04 from their feeder-breaker inputs. The separate SB01 spare transformer also labelled TF04 is excluded. This amendment supersedes station coverage requirements for the other feeders, including their station-side DB01/DB01B and TF03/village feeder details. It does not accept equipment states, source availability, winding relationships or physical interlocks.

**Unconfirmed:** whether the mine-services and village/camp downstream networks are excluded from V1 or retained behind external boundaries. This question is pending with the owner; do not infer its answer from the upstream cut. Independently documented cross-boundary connections require explicit treatment. Historical construction `.11` precedes this boundary amendment. Current `.14` retains the station cut introduced in `.13`; downstream mine/camp remains provisionally represented pending the separate scope answer. Whole-network acceptance means acceptance within the owner's confirmed scope and remains pending.

## User Stories

1. As a network user, I want to see the whole modelled network, so that I can understand how its areas connect.
2. As a network user, I want a network overview, so that I can orient myself before inspecting individual equipment.
3. As a network user, I want to navigate to detailed substation views, so that I can examine local switching arrangements.
4. As a network user, I want to pan and zoom the single-line diagram, so that I can inspect a large network at a useful scale.
5. As a network user, I want connections to remain consistent between overview and detailed views, so that changing views does not change the network I am exploring.
6. As a network user, I want to select an asset and see its identity and state, so that I know which equipment I am inspecting.
7. As a network user, I want controllable devices to expose their supported states, so that I can explore their modelled operation.
8. As a network user, I want to change circuit-breaker states, so that I can see their effect on connectivity.
9. As a network user, I want to change disconnector states where supported by the model, so that I can explore the resulting connection paths.
10. As a network user, I want to change earth-switch states where supported by the model, so that I can inspect the resulting earth connectivity.
11. As a network user, I want to enable or disable modelled sources, so that I can explore source availability independently of device switching.
12. As a network user, I want connectivity to update after an accepted change, so that the diagram reflects the current scenario.
13. As a network user, I want to distinguish connection to an enabled source from disconnection from all modelled sources, so that I can understand the effect of my scenario.
14. As a network user, I want results that depend on unresolved model information to be shown as unconfirmed, so that provisional interpretations are visible.
15. As a network user, I want alternate supply paths included in the result, so that opening one path does not hide another connection.
16. As a network user, I want to trace an asset's paths to available sources, so that I can understand why it remains connected.
17. As a network user, I want remaining alternate paths highlighted after switching, so that I can understand why some assets were unaffected.
18. As a network user, I want earth connectivity shown independently of source connectivity, so that both relationships are visible.
19. As a network user, I want source-to-earth conflicts highlighted, so that I can identify that condition within the model.
20. As a network user, I want to see which assets changed connectivity, so that I can understand the downstream impact of my action.
21. As a network user, I want changed connection paths highlighted, so that I can relate an impact to the diagram.
22. As a network user, I want an explanation of a modelled impact, so that I can understand the result rather than rely only on colour.
23. As a network user, I want physical interlocks represented in switching controls, so that actions prevented by the modelled interlocks cannot be performed.
24. As a network user, I want the reason for an interlock block displayed, so that I can understand the restriction in the scenario.
25. As a network user, I want unresolved interlocks identified and affected controls disabled, so that the application does not silently substitute an invented interlock rule.
26. As a network user, I want blocked changes to leave the scenario unchanged, so that the displayed state remains consistent with the accepted actions.
27. As a network user, I want a session to start from the agreed starting configuration, so that exploration begins from a reviewed reference point.
28. As a network user, I want to see my session action history, so that I can follow how I reached the current scenario.
29. As a network user, I want to undo accepted state changes, so that I can compare the effect of different actions.
30. As a network user, I want Reset network to restore the starting configuration, so that I can begin a fresh exploration.
31. As a network user, I want to save the current scenario to a file, so that I can return to it later.
32. As a network user, I want to reopen a saved scenario, so that I can continue exploring its device states and source availability when its model version matches.
33. As a network user, I want to share a scenario file with another user, so that they can inspect the same model and configuration.
34. As a network user, I want saved scenarios to include their original model snapshot, so that they do not depend on a separately retained historical model file.
35. As a network user, I want the saved and current model versions compared when loading, so that compatibility is explicit.
36. As a network user, I want a mismatched scenario to open using its original snapshot, so that I see its original connections and interlocks.
37. As a network user, I want a mismatched scenario clearly marked as view only, so that I understand why state changes are disabled.
38. As a network user, I want navigation, inspection, and path tracing in view-only mode, so that historical scenarios remain useful for understanding.
39. As a network user, I want view-only mode to prevent device and source changes, so that an older scenario is not silently treated as compatible with the current model.
40. As a network user, I want the completed application to operate without the PDFs, so that scenario exploration depends on the established model.
41. As a network user, I want to see the final LV bus endpoints, so that I can identify where this model's downstream coverage ends.
42. As a model maintainer, I want every supplied drawing tracked in the review, so that relevant network information is not omitted merely because it is distributed across documents.
43. As a model maintainer, I want diagrams visually checked alongside extracted text, so that connectivity is not reconstructed solely from text labels.
44. As a model maintainer, I want stable asset identities and drawing aliases recorded, so that conflicting labels can be reconciled without creating duplicate equipment.
45. As a model maintainer, I want modelled connections linked to their evidence or owner-confirmed decision, so that a provisional interpretation can be reviewed.
46. As a model maintainer, I want drawing discrepancies collected with the affected assets and connections, so that the owner can resolve them step by step.
47. As a model maintainer, I want provisional interpretations labelled as unconfirmed, so that construction can progress without presenting guesses as established facts.
48. As a model maintainer, I want unresolved external connections recorded explicitly, so that missing coverage does not silently become a disconnected endpoint.
49. As a model maintainer, I want interlock rules and their review status represented separately, so that an empty rule list is not mistaken for confirmation of the installed arrangement.
50. As a model maintainer, I want model structure checked before it is used, so that missing asset references or unsupported states are reported rather than silently ignored.
51. As the project owner, I want to review the whole-network diagram and asset connections, so that I can confirm the represented arrangement.
52. As the project owner, I want to review starting device states and source availability, so that I can establish the agreed starting configuration.
53. As the project owner, I want to review interlock rules and discrepancy resolutions, so that model acceptance covers the relevant restrictions and interpretations.
54. As the project owner, I want my model acceptance associated with a model version, so that it is clear which model was reviewed.
55. As a model maintainer, I want changes to the model to receive a new model version, so that historical scenarios remain distinguishable from the current network model.
56. As a project contributor, I want implementation tasks and unresolved dependencies tracked in GitHub, so that work can progress in reviewable increments toward whole-network V1 acceptance.

## Implementation Decisions

### Confirmed product decisions

- The application is for understanding isolations and network impacts. It does not provide an operational isolation workflow in this project.
- V1 covers the whole network to final LV bus endpoints, with outgoing LV circuits excluded.
- Source connectivity and earth connectivity are separate results; alternate supply paths are included. No electrical calculations are performed.
- Drawing-confirmed physical interlocks restrict switching. Affected controls remain disabled while an interlock is unresolved.
- The owner and maintainers construct and correct the model together. V1 has no network editor or automatic PDF importer requirement. PDFs are not a runtime dependency.
- The initial delivery is local and internet is available. A later GPT Site is a future delivery direction, not the initial deployment requirement.
- The interface includes overview/detail navigation, pan and zoom, asset inspection and controls, impact explanations, path tracing, source controls, undo, and reset.
- Saved scenarios contain states, source availability, model version and full original model snapshot. Version mismatches open as view only using the saved snapshot.
- Model acceptance includes the complete diagram, connections, starting configuration, sources, interlocks and resolved discrepancies, confirmed by the owner against the model version.

### Proposed implementation design

The following are implementation proposals derived from the confirmed behaviour. They do not establish any unconfirmed fact about the installed network. No framework, graph library, layout engine, test runner, hosting provider, or performance target has been selected.

- **Versioned model package:** represent assets, terminals, conductive connections, bus sections, transformer winding relationships, source attachment points, earth terminations, diagram organisation, supported device states, interlock conditions, starting configuration, evidence and review status as explicit model data. Asset identities remain distinct from display labels and drawing aliases.
- **Electrical topology and presentation:** keep the authoritative connectivity independent of diagram coordinates, page boundaries and overview/detail layouts. A crossing in a drawing does not become a junction without evidence or a flagged provisional interpretation. Represent the conductive relationships of multi-position and multi-winding equipment explicitly rather than guessing them from the asset name or symbol alone.
- **One simulation-session boundary:** the diagram and scenario-file controls use a single application-facing interface to load a model or scenario, select the current scenario mode, request device/source changes, obtain connectivity and impact explanations, undo, reset, and save a scenario. Rejected requests return a reason without changing the active scenario. The UI does not maintain a second set of switching or interlock rules.
- **Session ownership:** retain the model snapshot separately from mutable scenario states. Device changes, source changes, undo and reset produce a coherent session result containing the resulting states, source and earth connectivity, source-to-earth conflicts, affected assets and explanatory paths. Navigation and selection do not alter the electrical scenario.
- **Connectivity semantics:** evaluate available paths from the actual represented connections and device states, including multiple sources and loops. Reaching a transformer or equipment boundary uses the explicit modelled relationships; no universal backfeed behaviour is inferred. Disconnection from all modelled sources is distinct from an unconfirmed result. Unsupported gaps or unresolved source availability cannot silently become an open connection or an unavailable source.
- **Earth semantics:** record an earth connection as a trace termination, not a through path that joins otherwise unrelated circuits via a common earth node. An earth connection does not itself enable a source. Source and earth results can coexist for an asset; a represented path between an enabled source and earth produces a source-to-earth conflict.
- **Interlocks:** evaluate documented conditions before committing a state change and report the condition that blocked it. Keep unresolved interlock status distinct from both a confirmed rule and the absence of a documented rule. Do not invent key identities, physical operating positions, interlock sequences or generic restrictions unsupported by the sources and owner review. A conflict indication is not automatically an additional switching prohibition unless a represented physical interlock establishes that restriction.
- **Unknown and provisional information:** preserve the distinction between supported facts, provisional interpretations, unresolved questions and owner-confirmed resolutions. Where a connectivity result depends on unresolved information, show it as unconfirmed. A confirmed connection must remain identifiable even if additional possible routes are unresolved. Record the affected assets and supporting references so review can target the uncertainty.
- **History and reset:** retain accepted device/source changes for undo within the session. A blocked change does not become an accepted history entry. Reset restores all starting device states and source availability and recomputes results. Restoring history or the starting configuration does not provide a bypass around view-only mode.
- **Scenario contract:** save sufficient original model data and selected device/source states to reproduce that scenario's connectivity independently of the current model. Validate the scenario structure and referenced assets before replacing the active session. A malformed file produces a clear error and preserves the active scenario.
- **Version identity:** treat a model version as identifying an immutable model package. A changed topology, asset identity, interlock representation or agreed starting configuration requires a new version. Verify compatibility using the stored and current model versions; never apply an older scenario's state identifiers to the current topology merely because some labels match.
- **Historical viewing:** a version mismatch selects the original saved snapshot and disables all electrical state mutations, including switching, source changes, undo and reset. Pan, zoom, selection, asset inspection and path tracing remain available. The current model is not overwritten by viewing a historical scenario.
- **Maintenance and review:** use repository-managed model data and GitHub work items, with evidence-backed records for drawing discrepancies and their resolutions. Construction may progress with explicitly provisional information. Complete V1 model acceptance remains a separate owner review of the whole network; successful software tests do not establish the correctness of the installed-network representation.
- **Local delivery:** provide a local browser application whose simulation and scenario files operate from the established model. File saving/loading are adapters around the session boundary. No server-side account, shared persistence or live equipment connection is required by the agreed scope; eventual Sites packaging remains a separate implementation decision.

## Testing Decisions

**Testing boundary approved by the project owner on 22 October 2026.**

Use the simulation-session boundary as the primary behavioural test seam. Tests supply a model or saved scenario, perform user-facing actions, and assert resulting states, connectivity classifications, conflicts, impact explanations, rejection reasons and saved/reopened scenarios. Do not test graph traversal internals, private helpers, component state structures or a particular layout algorithm.

The session boundary exercises model loading/validation, switching and interlocks, connectivity/impact evaluation, history/reset and scenario compatibility together. Small browser checks exercise the rendered controls and file adapters through that same boundary; they do not duplicate the domain rules in a second test implementation.

Prior art: the inspected local repository contains requirements, a glossary and drawing-review utilities. It has no application implementation, application test suite, existing session interface or selected test runner. The proposed boundary is new.

Required externally observable cases:

1. A confirmed single-source path connects its assets; opening its controlling device changes the appropriate results and impact explanation.
2. Opening one of two available paths leaves assets connected through the remaining path and identifies that route.
3. Bus ties, multiple enabled sources, loops and disconnected sections produce consistent results without inventing additional connections.
4. Source availability changes update connectivity without changing unrelated device states.
5. A represented earth-switch action changes earth connectivity independently of source connectivity; a source-to-earth path is reported as a conflict.
6. Separate circuits with earth connections are not treated as supplying one another through a shared earth representation.
7. A documented interlock blocks a prohibited action, explains the reason, and leaves device states, results and accepted history unchanged.
8. An unresolved interlock disables affected switching through both the displayed controls and the session interface.
9. Unresolved topology, device-state or source information produces unconfirmed results where material, rather than silently defaulting to disconnected. A known source path remains identifiable.
10. Explicitly represented multi-position devices and transformer relationships affect connectivity according to their model data; unsupported arrangements are not substituted.
11. Undo restores the preceding accepted scenario states and recomputes their connectivity. Reset restores both device states and source availability from the agreed starting configuration.
12. A saved scenario round trip preserves its original model snapshot, model version, device states, source availability and reproduced connectivity results. Persisting full action history is not required by the confirmed scenario contract.
13. A matching model version permits scenario exploration. A different version renders the saved original model in view-only mode and prevents every electrical mutation while retaining inspection and tracing.
14. Malformed models/scenarios and unknown asset references are reported without silently dropping data or replacing a valid active session.
15. Overview and detailed views show the same session results; selecting an asset, changing its state, inspecting impacts, navigating and tracing paths behave consistently in the rendered application.
16. The application loads its established model and a saved scenario without needing the source PDFs.

Use small, explicitly synthetic models for behavioural cases; they are not evidence of the site's physical topology or interlocks. Add regression cases for owner-resolved discrepancies when those resolutions establish the expected behaviour. Validate real model data structurally and trace it to evidence, then obtain owner model acceptance separately.

V1 acceptance also requires complete agreed network coverage through final LV bus endpoints; no outgoing LV circuit expansion; a reviewed starting configuration; review of interlock rules and discrepancy resolutions; and the owner's confirmation against the model version. No numeric latency or scale acceptance threshold has yet been agreed.

## Out of Scope

- Operational isolation planning, switching-program generation, work authorisation, or declarations that equipment is safe to work on.
- Voltage, current, load-flow, short-circuit, fault-level, protection-coordination or other electrical calculations.
- Outgoing LV circuits beyond the final LV bus endpoints.
- A user-facing network editor or a product feature that automatically imports arbitrary PDFs.
- Requiring original PDFs for runtime simulation after the model is established.
- Inventing undocumented physical interlocks or silently resolving drawing discrepancies.
- Live telemetry, automatic synchronisation with real equipment, or remote control of equipment.
- Automatic migration of an older scenario onto a different current model.
- Production GPT Site deployment in the initial local application deliverable.

## Further Notes

- **Status:** specification prepared from the owner's confirmed product design and approved testing boundary. The implementation design above remains an explicit proposal; unresolved installed-network facts require source review and owner confirmation.
- The selected tracker is GitHub, repository `AedenBryce/Interactive-HV-Network`. This is the parent specification for the subsequent to-tickets flow. Apply `ready-for-agent`; implementation tickets must explicitly identify any unresolved dependencies.
- The completed file intake covers 141 single-page PDFs, with 140 unique file contents; 53 files have little or no extractable text. Seven complete pages have received an initial visual inspection. These intake figures do not establish whole-network coverage, drawing precedence, source availability, current states or interlock correctness.
- Initial unresolved review records cover incomer source/commissioning status (R001), conflicting feeder device identities (R002), incomplete earthing interlock conditions (R003), external/off-page coverage (R004), and the unaccepted starting configuration (R005). They are open questions, not final conclusions about the installed network. Continue the remaining source review before presenting the accumulated discrepancies for step-by-step owner resolution.
- Do not treat a publication or the `ready-for-agent` label as model acceptance or as confirmation of unresolved electrical facts. Software behaviour can be developed against synthetic data while real-network acceptance remains dependent on the source review and owner decisions.
- No ADRs or runnable prototype were present in the inspected local project. There is no prototype-derived code in this specification.
