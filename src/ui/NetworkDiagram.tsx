import { matchesEditingPassword } from './editing-password';
import { rotateObjects, turnBox } from './object-rotation';
import { manualLabelLayout } from './manual-label-layout';
import { selectorEarthTag } from './switch-display-tags';
import { threePositionContacts } from './three-position-contacts';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import type { SessionSnapshot } from '../session/session';
import type { SourcePath } from '../session/connectivity';
import type { DiagramPresentation } from './diagram';
import { clearConnectorCaptions } from './connector-clearance';
import { withFinalBoardFrames } from './final-board-frames';
import { transformerPortLayout } from './transformer-port-layout';
import { EquipmentSymbol } from './EquipmentSymbol';
import { busTieSymbols } from './bus-tie-symbol';
import { isIndependentState } from '../session/mechanisms';
import { isSupported } from '../session/evidence';
import { diagramGeometry } from './diagram-geometry';
import type { continuousNetwork } from './continuous-network';
import { loadAuthoredLayout } from './authored-layout-loader';
import { applyLayoutEdits, selectLayoutBox } from './layout-edit';
import { applyLineRoutes, moveLineSegment, snapCoordinate, snapLineDelta, simplifyLineRoute, removeLineSegment } from './line-routing';
import type { LineRoutes } from './line-routing';
import { boxesIntersect, routeInViewport } from './viewport-geometry';
import { defaultDiagramAppearance } from './diagram-appearance';
import { applyBusTakeoffs, drawingBusEarthMoves, busEndClearance } from './bus-earth-layout';
import { condensePositions, enlargeLabels, fitCompactFrames } from './compact-presentation';
import { placeRoomIdentifiers, roomIdentifierObstacles } from './room-identifier-layout';
import { switchroomBuses } from './switchroom-buses';
import type { LayoutBoxSelection } from './layout-edit';
import type { LayoutEdits } from './layout-edit';
import type { LayoutReviewDocument } from './layout-review';
import { useLayoutReview } from './use-layout-review';
import type { AuthoredSchematic } from './authored-schematic';
import { capitalState, compactEquipmentLabel, hasDeviceCard, isDrive, isFuse, isMotor } from './equipment-appearance';
import { currentAssetLabel } from './review-updates';
import { deviceCard } from './device-card';
import { captionLeader, driveInputCaptions, earthCaptionLayout } from './equipment-captions';
import { chooseContextLabelPositionIndexed, ContextLabelCollisionIndex, ContextWireCollisionIndex, contextLabelPositions, semanticZoomLevel } from './semantic-zoom';
import { applyVisualCrossingGaps, crossingGapWidthForScale, findVisualRouteCrossings } from './route-crossing-gaps';
import { uniqueConductorFragments } from './conductor-paths';
import { conductorReservations } from './conductor-reservations';
import ContinuousNetworkWorker from './continuous-network.worker?worker';
import './navigation.css';



type Props = { snapshot: SessionSnapshot; selectedId: string; tracedPath?: SourcePath; presentation: DiagramPresentation; onSelectAsset: (id: string, element?: Element, roomLabel?: string, openActions?: boolean) => void };
type Camera = { x: number; y: number; width: number; height: number };
type LocalLabel = { x: number; y: number; width: number; height: number; lines: string[] };
type RoomFrame = { x: number; y: number; width: number; height: number; title: string; overviewTitle: string };
type DiagramGeometry = ReturnType<typeof diagramGeometry> & Partial<Pick<ReturnType<typeof continuousNetwork>, 'panels' | 'hiddenIds' | 'inlineIds' | 'referenceTop' | 'referenceLabel' | 'referenceBounds' | 'referenceIds' | 'treeEdgeIds'>> & { owners: ReadonlyMap<string, string> };
const searchable = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const focusedDetailScale = .5;

function roomTitleScreenBox(panel: RoomFrame, scale: number, camera: Camera) {
  const x = (panel.x - camera.x) * scale;
  const y = (panel.y - camera.y) * scale;
  const width = panel.width * scale;
  const height = panel.height * scale;
  const overview = scale < .06;
  const primary = panel.overviewTitle.match(/(?:MCC|MC|SW|RM)\s*\d+[A-Z]?/i)?.[0].replace(/\s+/g, '');
  const hopper = panel.overviewTitle.match(/Hopper\s*(\d+)/i)?.[1];
  const title = overview
    ? panel.overviewTitle.startsWith('HPGR') ? panel.overviewTitle.replace(/\s+/g, ' ') : primary ? `${primary}${hopper ? ` H${hopper}` : ''}` : panel.overviewTitle
    : panel.title;
  const font = Math.min(overview ? 12 : 16, (width - 16) / (title.length * .62));
  const horizontal = font >= 8 && height >= font + 6;
  const stackedParts = overview ? title.match(/^([A-Z]+)\s*(\d+[A-Z]?)$/i) : null;
  const stacked = overview && !horizontal && !!stackedParts && width >= 20 && height >= 25;
  const verticalFont = Math.min(8, (height - 4) / (title.length * .62));
  const vertical = overview && !horizontal && !stacked && width >= 8 && verticalFont >= 8;
  if (!horizontal && !stacked && !vertical) return undefined;
  const textFont = horizontal ? font : stacked ? Math.min(8, (width - 4) / 1.9) : verticalFont;
  const titleLines = stacked && stackedParts ? [stackedParts[1], stackedParts[2]] : [title];
  const textWidth = Math.max(...titleLines.map(line => line.length * textFont * .62));
  const titleX = vertical || stacked || overview ? x + width / 2 : x + 18 * scale;
  const titleY = vertical ? y + height / 2 : y + Math.max(34 * scale, textFont * 1.35);
  return vertical
    ? { x: titleX - textFont / 2 - 3, y: titleY - textWidth / 2 - 3, width: textFont + 6, height: textWidth + 6 }
    : { x: (stacked ? titleX - textWidth / 2 : titleX) - 3, y: titleY - textFont - 3, width: textWidth + 6, height: (stacked ? textFont * 2.05 : textFont) + 6 };
}

export function NetworkDiagram(props: Props) {
  const continuous = props.snapshot.model.id === 'site-whole-network'
    && !!props.snapshot.model.presentation?.views.find(item => item.id === props.snapshot.model.presentation?.overviewId)?.regions?.length;
  return continuous ? <ContinuousNetworkDiagram {...props} /> : <NetworkDiagramCanvas {...props} />;
}

function ContinuousNetworkDiagram(props: Props) {
  const { snapshot } = props;
  const requestKey = `${snapshot.model.id}:${snapshot.model.version}`;
  const [result, setResult] = useState<{ key: string; geometry?: DiagramGeometry; error?: string; layoutRevision?: string } | null>(null);

  useEffect(() => {
    let worker: Worker | undefined;
    let cancelled = false;
    setResult(null);
    void (async () => {
      const { default: saved } = await import('../models/site/authored-network.json');
      const schematic = saved as unknown as AuthoredSchematic;
      if (snapshot.model.id === schematic.modelId && snapshot.model.version === schematic.modelVersion) {
        const geometry = await loadAuthoredLayout(snapshot.model, schematic);
        if (!cancelled) setResult({ key: requestKey, geometry, layoutRevision: saved.layoutRevision });
        return;
      }
      if (cancelled) return;
      // Historical scenarios keep their own model and presentation. Only those
      // versions use the historical worker; the current drawing loads directly.
      worker = new ContinuousNetworkWorker();
      const requestId = `${Date.now()}:${Math.random()}`;
      worker.onmessage = (event: MessageEvent<{ requestId: string; geometry?: ReturnType<typeof continuousNetwork>; error?: string }>) => {
        if (cancelled || event.data.requestId !== requestId) return;
        setResult(event.data.geometry
          ? { key: requestKey, geometry: event.data.geometry }
          : { key: requestKey, error: event.data.error ?? 'The network layout could not be calculated.' });
        worker?.terminate();
      };
      worker.onerror = event => {
        const location = event.filename ? ` at ${event.filename}:${event.lineno}:${event.colno}` : '';
        setResult({ key: requestKey, error: `${event.message || 'The network layout worker stopped unexpectedly.'}${location}` });
        worker?.terminate();
      };
      worker.onmessageerror = () => {
        setResult({ key: requestKey, error: 'The browser could not read the calculated network layout.' });
        worker?.terminate();
      };
      worker.postMessage({ requestId, model: snapshot.model, roomModulePreview: false });
    })().catch(error => {
      if (!cancelled) setResult({ key: requestKey, error: error instanceof Error ? error.message : String(error) });
      worker?.terminate();
    });
    return () => { cancelled = true; worker?.terminate(); };
  }, [requestKey, snapshot.model]);

  if (!result || result.key !== requestKey) {
    return <main className="diagram-panel interactive-diagram whole-network">
      <div className="panel-heading"><h2>Whole network · single-line diagram</h2><p>Preparing {snapshot.model.assets.length} assets and {snapshot.model.connections.length} connections…</p></div>
      <div className="diagram-surface"><div className="network-diagram-loading" role="status" aria-live="polite">Preparing the full network diagram…</div></div>
    </main>;
  }
  if (result.error || !result.geometry) {
    return <main className="diagram-panel interactive-diagram whole-network">
      <div className="panel-heading"><h2>Whole network · single-line diagram</h2><p>Preparing {snapshot.model.assets.length} assets and {snapshot.model.connections.length} connections…</p></div>
      <div className="diagram-surface"><div className="network-diagram-loading" role="alert">Unable to prepare the network diagram: {result.error ?? 'Unknown layout error.'}</div></div>
    </main>;
  }
  return <NetworkDiagramCanvas key={`${requestKey}:${result.layoutRevision ?? 'historical'}`} {...props} precomputedGeometry={result.geometry} layoutRevision={result.layoutRevision} />;
}

function NetworkDiagramCanvas({ snapshot, selectedId, tracedPath, presentation, onSelectAsset, precomputedGeometry, layoutRevision = 'historical' }: Props & { precomputedGeometry?: DiagramGeometry; layoutRevision?: string }) {
  const [viewId, setViewId] = useState(presentation.overviewId);
  const [viewSearch, setViewSearch] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const continuous = snapshot.model.id === 'site-whole-network' && !!snapshot.model.presentation?.views.find(item => item.id === snapshot.model.presentation?.overviewId)?.regions?.length;
  const matchingViews = presentation.views.filter(item => item.label.toLowerCase().includes(viewSearch.trim().toLowerCase()));
  const sourceView = presentation.views.find(item => item.id === viewId)!;
  // Session packages are immutable by ID/version; switching changes no coordinates.
  const baseGeometry: DiagramGeometry = useMemo(() => {
    if (precomputedGeometry) return precomputedGeometry;
    if (!continuous) return diagramGeometry(snapshot.model, sourceView);
    throw new Error('The continuous diagram requires validated precomputed geometry.');
  }, [continuous, precomputedGeometry, snapshot.model.id, snapshot.model.version, sourceView.id]);
  const editor = useLayoutReview({ modelId: snapshot.model.id, modelVersion: snapshot.model.version, layoutRevision }, baseGeometry.assets.map(asset => asset.id), (baseGeometry.panels ?? []).map(panel => panel.id));
  const appearance = editor.review.appearance ?? defaultDiagramAppearance;
  const textScale = appearance.textScale ?? 1;
  const [editMode, setEditMode] = useState(false);
  const [editUnlockOpen,setEditUnlockOpen]=useState(false);
  const [editPassword,setEditPassword]=useState('');
  const [editPasswordError,setEditPasswordError]=useState('');
  const [editUnlockBusy,setEditUnlockBusy]=useState(false);
  function closeEditUnlock(){setEditUnlockOpen(false);setEditPassword('');setEditPasswordError('');}
  async function unlockEditing(){
    if(editUnlockBusy)return;
    setEditUnlockBusy(true);
    try{
      if(await matchesEditingPassword(editPassword)){closeEditUnlock();setEditMode(true);selectAsset(selectedId,undefined,false);}
      else {setEditPasswordError('Incorrect password.');setEditPassword('');}
    }catch{setEditPasswordError('Unable to unlock editing.');}
    finally{setEditUnlockBusy(false);}
  }
  const [dragTarget, setDragTarget] = useState<'select' | 'box' | 'asset' | 'room' | 'line' | 'label' | 'pan'>('select');
  const [selectedLabelId,setSelectedLabelId]=useState<string>();
  const [boxSelection, setBoxSelection] = useState<LayoutBoxSelection>({ assets: [], rooms: [] });
  const [marquee, setMarquee] = useState<{ start: [number, number]; end: [number, number] }>();
  const [movingLayout, setMovingLayout] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [selectedLineId, setSelectedLineId] = useState<string>();
  const [selectedLineSegment, setSelectedLineSegment] = useState<number>();
  const [snapGuides, setSnapGuides] = useState<{ axis: 'x' | 'y'; value: number }[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>();
  const [positionPreview, setPositionPreview] = useState<DiagramGeometry>();
  const positionedGeometry = useMemo(() => switchroomBuses(applyLayoutEdits(baseGeometry, editor.review.edits, new Set(editor.review.independentAssetPositions)), editor.review.compactFrames), [baseGeometry, editor.review.edits, editor.review.independentAssetPositions, editor.review.compactFrames]);
  const automaticGeometry: DiagramGeometry = useMemo(() => {
    const positioned = applyLineRoutes(rotateObjects(transformerPortLayout(applyBusTakeoffs(busEndClearance(positionPreview ?? positionedGeometry), editor.review.busTakeoffs ?? {}), appearance.symbolScale), editor.review.rotations), editor.review.lineRoutes ?? {});
    const combinedEarthIds=positioned.assets.flatMap(a=>a.earthAssembly?[a.earthAssembly.earthAssetId]:[]);
    const projected={...positioned,hiddenIds:new Set([...(positioned.hiddenIds??[]),...combinedEarthIds])};
    const captionNames = { ...Object.fromEntries(positioned.assets.map(asset => [asset.id, compactEquipmentLabel(asset, currentAssetLabel(snapshot.model, asset))])), ...editor.review.names };
    const labelled = enlargeLabels(projected, textScale, appearance.symbolScale, captionNames);
    const framed = fitCompactFrames(withFinalBoardFrames(labelled), appearance.symbolScale, editor.review.framePaddingScale);
    if(movingLayout)return framed;
    const cleared=clearConnectorCaptions(framed, appearance.symbolScale, new Set(editor.review.manualLineRoutes));
    return (editor.review.framePaddingScale??1)<1
      ? fitCompactFrames(enlargeLabels(cleared,textScale,appearance.symbolScale,captionNames),appearance.symbolScale,editor.review.framePaddingScale)
      : cleared;
  }, [positionedGeometry, positionPreview, editor.review.lineRoutes, editor.review.busTakeoffs, textScale, appearance.symbolScale, editor.review.compactFrames, editor.review.framePaddingScale, editor.review.names, editor.review.manualLineRoutes, editor.review.rotations, movingLayout]);
  const geometry=useMemo(()=>manualLabelLayout(automaticGeometry,editor.review.labelPositions),[automaticGeometry,editor.review.labelPositions]);
  const { view, assets, connections } = geometry;
  const tieSymbols=useMemo(()=>busTieSymbols(assets,connections,view.layout,appearance.symbolScale),[assets,connections,view.layout,appearance.symbolScale]);
  const assemblyEarthIds = useMemo(() => new Set(assets.flatMap(a=>a.earthAssembly?[a.earthAssembly.earthAssetId]:[])),[assets]);
  const assemblyEarthLabels = useMemo(()=>new Map(assets.filter(a=>assemblyEarthIds.has(a.id)).map(a=>[a.id,compactEquipmentLabel(a,currentAssetLabel(snapshot.model,a)).split('\n')[0]])),[assets,assemblyEarthIds,snapshot.model]);

  const sourceAssets = useMemo(() => new Set(snapshot.model.sources.map(source => source.assetId)), [snapshot.model.sources]);
  const roomByAsset = useMemo(() => new Map((geometry.panels ?? []).flatMap(panel => (panel.memberAssetIds ?? panel.assetIds).filter(id => !sourceAssets.has(id)).map(id => [id, panel.id] as const))), [geometry.panels, sourceAssets]);
  const matchingAssets = useMemo(() => {
    const query = searchable(assetSearch);
    return query ? assets.filter(asset => (!geometry.hiddenIds?.has(asset.id) || assemblyEarthIds.has(asset.id)) && [editor.review.names?.[asset.id] ?? '', asset.label, asset.id, ...(asset.aliases ?? [])].some(value => searchable(value).includes(query))).slice(0, 12) : [];
  }, [assets, assetSearch, editor.review.names, geometry.hiddenIds, assemblyEarthIds]);
  const [cameraOverride, setCamera] = useState<Camera | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const fitBounds = useMemo(() => {
    if (!continuous || !geometry.panels?.length) return view.bounds;
    const xs: number[] = []; const ys: number[] = [];
    for (const [x, y] of Object.values(geometry.view.layout.assets)) { xs.push(x); ys.push(y); }
    for (const label of geometry.labels.values()) {
      xs.push(label.x, label.x + label.width); ys.push(label.y, label.y + label.height);
    }
    for (const connection of connections) {
      for (const [x, y] of geometry.routes.get(connection.id) ?? []) { xs.push(x); ys.push(y); }
    }
    for (const sourceId of sourceAssets) {
      const [x, y] = geometry.view.layout.assets[sourceId] ?? [undefined, undefined];
      if (x !== undefined && y !== undefined) { xs.push(x - 400, x + 400); ys.push(y - 400, y + 400); }
    }
    if (geometry.referenceBounds) {
      xs.push(geometry.referenceBounds.x, geometry.referenceBounds.x + geometry.referenceBounds.width);
      ys.push(geometry.referenceBounds.y, geometry.referenceBounds.y + geometry.referenceBounds.height);
    }
    if (!xs.length) return view.bounds;
    // Source markers are positioned independently from their detailed labels
    // at overview scale, so leave enough screen space for those tags to stay
    // clear of the SVG edge after the initial fit.
    const padding = 2_800;
    const left = Math.min(...xs) - padding; const top = Math.min(...ys) - padding;
    const right = Math.max(...xs) + padding; const bottom = Math.max(...ys) + padding;
    return [left, top, right - left, bottom - top] as [number, number, number, number];
  }, [continuous, connections, geometry.labels, geometry.panels, geometry.referenceBounds, geometry.routes, geometry.view.layout.assets, sourceAssets, view.bounds]);
  const fitCamera = useMemo(() => {
    const [x, y, width, height] = fitBounds;
    const ratio = viewport.width > 0 && viewport.height > 0 ? viewport.width / viewport.height : 1000 / 700;
    const fittedWidth = Math.max(width, height * ratio); const fittedHeight = fittedWidth / ratio;
    return { x: x + (width - fittedWidth) / 2, y: y + (height - fittedHeight) / 2, width: fittedWidth, height: fittedHeight };
  }, [fitBounds, viewport]);
  const navigationFitCamera = fitCamera;
  const camera = cameraOverride ?? navigationFitCamera;
  const drag = useRef<{ pointerId: number; x: number; y: number; camera: Camera } | null>(null);
  const lineDrag = useRef<{ pointerId: number; id: string; index: number; points: [number, number][]; start: [number, number]; before: LayoutReviewDocument; latest: LineRoutes; moved: boolean } | null>(null);
  const labelDrag=useRef<{pointerId:number;id:string;assetId:string;start:[number,number];origin:[number,number];anchor:[number,number];before:LayoutReviewDocument;latest:NonNullable<LayoutReviewDocument['labelPositions']>;moved:boolean}|null>(null);
  const layoutDrag = useRef<{ pointerId: number; x: number; y: number; scale: number; assets: string[]; rooms: string[]; snapTargets: { x: number; y: number; guideX: number; guideY: number }[]; geometry: DiagramGeometry; before: LayoutReviewDocument; latest: LayoutEdits; moved: boolean } | null>(null);
  const marqueeDrag = useRef<{ pointerId: number; start: [number, number]; end: [number, number]; camera: Camera; additive: boolean } | null>(null);
  const skipClick = useRef(false);
  const pendingPointer = useRef<{ pointerId: number; clientX: number; clientY: number; shiftKey: boolean; currentTarget: SVGSVGElement } | null>(null);
  const pointerFrame = useRef<number | null>(null);
  useEffect(() => () => { if (pointerFrame.current !== null) cancelAnimationFrame(pointerFrame.current); }, []);
  const svgRef = useRef<SVGSVGElement>(null);
  const visible = new Set(view.assetIds);
  const removedEdges = new Set(snapshot.impact.flatMap(item => item.before.routeEdgeIds.filter(id => !item.after.routeEdgeIds.includes(id))));
  const labels = new Map(snapshot.model.assets.map(asset => [asset.id, asset.label]));
  const selectedVisible = visible.has(selectedId);
  const drawingScale = Math.min(viewport.width / camera.width, viewport.height / camera.height);
  const scaleReady = Number.isFinite(drawingScale) && drawingScale > 0;
  const zoomPercent = drawingScale < .1 ? `${(drawingScale * 100).toFixed(1)}%` : `${Math.round(drawingScale * 100)}%`;
  const semanticZoom = semanticZoomLevel(drawingScale, continuous);
  const identifierObstacles = useMemo(() => roomIdentifierObstacles(geometry, appearance.symbolScale, semanticZoom !== 'overview'), [geometry, appearance.symbolScale, semanticZoom]);
  const identifierLayouts = useMemo(() => placeRoomIdentifiers((geometry.panels ?? []).map(panel => {
    const tag = panel.overviewTitle.match(/(?:MCC|MC|SW|RM)\s*\d+[A-Z]?/i)?.[0].replace(/\s+/g, '');
    const hopper = panel.overviewTitle.match(/Hopper\s*(\d+)/i)?.[1];
    const caption = /HPGR/i.test(panel.overviewTitle) ? 'HPGR' : tag ? `${tag}${hopper ? ` H${hopper}` : ''}` : panel.overviewTitle;
    return { ...panel, caption };
  }), drawingScale, identifierObstacles), [geometry.panels, drawingScale, identifierObstacles]);
  // Authored labels and symbols keep the same coordinates throughout zoom.
  // The old intermediate mode culled/repositioned labels and enlarged symbols,
  // making equipment disappear or jump before the detail threshold.
  const detailLevel = semanticZoom === 'overview' ? 'overview' : 'detail';
  const contextLabelLevel: boolean = false;
  const assetBounds = useMemo(() => new Map(assets.filter(asset => !geometry.hiddenIds?.has(asset.id)).map(asset => {
    const [x, y] = view.layout.assets[asset.id], label = geometry.labels.get(asset.id);
    const terminals = asset.terminals.map(id => view.layout.terminals[id]);
    const span = view.layout.busSpans?.[asset.id] ?? 0;
    const horizontal = view.layout.rotations?.[asset.id] === 90;
    const left = Math.min(x - Math.max(80 * appearance.symbolScale, horizontal ? span / 2 : 0), label?.x ?? x, ...terminals.map(p => p[0]));
    const right = Math.max(x + Math.max(80 * appearance.symbolScale, horizontal ? span / 2 : 0), label ? label.x + label.width : x, ...terminals.map(p => p[0]));
    const top = Math.min(y - Math.max(80 * appearance.symbolScale, horizontal ? 0 : span / 2), label?.y ?? y, ...terminals.map(p => p[1]));
    const bottom = Math.max(y + Math.max(150 * appearance.symbolScale, horizontal ? 0 : span / 2), label ? label.y + label.height : y, ...terminals.map(p => p[1]));
    return [asset.id, { x: left, y: top, width: right - left, height: bottom - top }] as const;
  })), [assets, geometry.hiddenIds, geometry.labels, view.layout, appearance.symbolScale]);
  // Rendering is a viewport projection only. Selection, routing, fitting and
  // saved reviews continue to use the complete model and geometry.
  const renderBox = useMemo(() => {
    const margin = 100 / Math.max(.001, drawingScale);
    return { x: camera.x - margin, y: camera.y - margin, width: camera.width + margin * 2, height: camera.height + margin * 2 };
  }, [camera, drawingScale]);
  const allDisplayedAssets = useMemo(() => assets.filter(asset => {
    const bounds = assetBounds.get(asset.id); return !assemblyEarthIds.has(asset.id) && bounds && boxesIntersect(bounds, renderBox);
  }), [assets, assetBounds, renderBox, assemblyEarthIds]);
  const focusedPanel = geometry.panels?.find(item => (item.memberAssetIds ?? item.assetIds).includes(selectedId));
  // The single continuous overview always contains the complete network.
  // Semantic zoom simplifies labels/symbols for legibility, but never hides
  // room internals or their connections.
  const visibleConnections = useMemo(()=>connections.filter(connection=>!tieSymbols.hiddenConnectionIds.has(connection.id)&&!assemblyEarthIds.has(geometry.owners.get(connection.to)!)&&!assemblyEarthIds.has(geometry.owners.get(connection.from)!)),[connections,assemblyEarthIds,geometry.owners,tieSymbols]);
  const renderedConnections = useMemo(() => visibleConnections.filter(connection => routeInViewport(geometry.routes.get(connection.id) ?? [], renderBox)), [visibleConnections, geometry.routes, renderBox]);
  const displayedAssets = allDisplayedAssets;
  const crossingGap = crossingGapWidthForScale(drawingScale);
  const crossingLocations = useMemo(() => movingLayout ? [] : findVisualRouteCrossings(visibleConnections, geometry.routes), [geometry.routes, movingLayout, visibleConnections]);
  const crossingFragments = useMemo(() => applyVisualCrossingGaps(geometry.routes, crossingLocations, crossingGap), [crossingGap, crossingLocations, geometry.routes]);
  const reservedConductors=useMemo(()=>conductorReservations(assets,view.layout,appearance.symbolScale,new Set([...(geometry.hiddenIds??[]),...assemblyEarthIds]),geometry.inlineIds??new Set(),tieSymbols.bars,detailLevel==='detail'),[assets,view.layout,appearance.symbolScale,geometry.hiddenIds,geometry.inlineIds,assemblyEarthIds,tieSymbols.bars,detailLevel]);
  const conductorFragments = useMemo(() => {
    const conflicts = new Set(snapshot.conflicts.flatMap(item => item.connectionIds));
    const traced = new Set(tracedPath?.connectionIds);
    return uniqueConductorFragments(visibleConnections, crossingFragments, assets, id => {
      const result = snapshot.connectionResults[id];
      return (conflicts.has(id) ? 1000 : 0) + (traced.has(id) ? 100 : 0)
        + (result?.earthStatus === 'connected' ? 30 : 0) + (result?.sourceStatus === 'connected' ? 20 : result?.sourceStatus === 'unconfirmed' ? 10 : 0);
    },reservedConductors);
  }, [visibleConnections, crossingFragments, assets, snapshot.conflicts, snapshot.connectionResults, tracedPath,reservedConductors]);
  const contextLabels = useMemo(() => {
    const result = new Map<string, LocalLabel>();
    if (!continuous || !contextLabelLevel || !scaleReady) return result;

    const scale = drawingScale;
    const placed = new ContextLabelCollisionIndex();
    for (const panel of geometry.panels ?? []) {
      const box = roomTitleScreenBox(panel, scale, camera);
      if (box) placed.add(box);
    }
    const reserve = (x: number, y: number, width: number, height: number) => {
      placed.add({ x: x - 5, y: y - 4, width: width + 10, height: height + 8 });
    };
    // Keep the selected and source labels stable while nearby device IDs
    // appear as the user zooms into an area.
    for (const sourceId of sourceAssets) {
      const [x, y] = view.layout.assets[sourceId] ?? [];
      if (x === undefined || y === undefined) continue;
      const left = (x + 12 / scale - camera.x) * scale;
      const top = (y - 9 / scale - camera.y) * scale;
      if (left < viewport.width && left + 48 > 0 && top < viewport.height && top + 18 > 0) reserve(left, top, 48, 18);
    }
    if (!sourceAssets.has(selectedId)) {
      const [x, y] = view.layout.assets[selectedId] ?? [];
      if (x !== undefined && y !== undefined) {
        const left = (x + 54 / scale - camera.x) * scale;
        const top = (y - 18 / scale - camera.y) * scale;
        if (left < viewport.width && left + 176 > 0 && top < viewport.height && top + 38 > 0) reserve(left, top, 176, 38);
      }
    }

    const routeSegments = visibleConnections.flatMap(connection => {
      const route = geometry.routes.get(connection.id) ?? [];
      return route.slice(1).map((point, index) => ({
        from: [(route[index][0] - camera.x) * scale, (route[index][1] - camera.y) * scale] as [number, number],
        to: [(point[0] - camera.x) * scale, (point[1] - camera.y) * scale] as [number, number],
      }));
    });
    const wireIndex = new ContextWireCollisionIndex();
    for (const segment of routeSegments) wireIndex.add(segment.from, segment.to);
    const priorityAssetIds = new Set<string>([
      ...sourceAssets,
      ...displayedAssets.filter(asset => asset.kind === 'bus' || asset.kind === 'transformer').map(asset => asset.id),
      ...visibleConnections.flatMap(connection => [geometry.owners.get(connection.from), geometry.owners.get(connection.to)].filter((id): id is string => Boolean(id))),
    ]);
    const candidates = displayedAssets.flatMap(asset => {
      if (sourceAssets.has(asset.id) || asset.id === selectedId || !priorityAssetIds.has(asset.id)) return [];
      const position = view.layout.assets[asset.id];
      const base = geometry.labels.get(asset.id);
      if (!position || !base) return [];
      const text = base.lines[0]?.trim();
      if (!text) return [];
      const shortened = text.length > 24 ? `${text.slice(0, 23)}…` : text;
      const width = Math.min(180, Math.max(78, shortened.length * 7 + 18));
      const state = snapshot.devices[asset.id];
      const stateText = state === undefined
        ? undefined
        : isIndependentState(state)
          ? `${capitalState(state.contact ?? 'Unconfirmed')} / Rack ${capitalState(state.racking ?? 'Unconfirmed')}`
          : capitalState(String(state));
      const height = stateText ? 36 : 24;
      const centerX = (position[0] - camera.x) * scale;
      const centerY = (position[1] - camera.y) * scale;
      return [{
        asset, text: shortened, stateText, position,
        positions: contextLabelPositions(centerX, centerY, width, height),
        priority: hasDeviceCard(asset) ? 0 : 1,
      }];
    }).sort((a, b) => a.priority - b.priority || a.position[1] - b.position[1] || a.position[0] - b.position[0]);

    // Context labels are already restricted to the visible viewport and
    // collision-checked against placed labels and routed wires. A fixed count
    // cap made assets disappear based on their position in the tree even when
    // there was clear screen space for their labels.
    for (const candidate of candidates) {
      const { asset, text, stateText, positions } = candidate;
      const box = chooseContextLabelPositionIndexed(positions, viewport, placed, screenBox => wireIndex.intersects(screenBox));
      if (!box) continue;
      placed.add(box);
      result.set(asset.id, {
        x: camera.x + box.x / scale,
        y: camera.y + box.y / scale,
        width: box.width / scale,
        height: box.height / scale,
        lines: stateText ? [text, stateText] : [text],
      });
    }
    return result;
  }, [camera, contextLabelLevel, continuous, displayedAssets, drawingScale, geometry.labels, geometry.panels, geometry.owners, geometry.routes, scaleReady, selectedId, snapshot.devices, sourceAssets, view.layout.assets, viewport, visibleConnections]);
  const maxZoom = continuous ? Math.max(16, navigationFitCamera.width / 300) : 16;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setCamera(previous => previous ? { ...previous, height: previous.width * height / width, y: previous.y + (previous.height - previous.width * height / width) / 2 } : null);
        setViewport({ width, height });
      }
    });
    observer.observe(svg); return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      setCamera(previous => {
        const base = previous ?? navigationFitCamera;
        if (base.width <= 0 || base.height <= 0) return previous;
        const scale = Math.min(rect.width / base.width, rect.height / base.height);
        const ax = Math.max(0, Math.min(1, (event.clientX - rect.left - (rect.width - base.width * scale) / 2) / (base.width * scale)));
        const ay = Math.max(0, Math.min(1, (event.clientY - rect.top - (rect.height - base.height * scale) / 2) / (base.height * scale)));
        const width = Math.max(navigationFitCamera.width / maxZoom, Math.min(navigationFitCamera.width * 4, base.width * Math.exp(Math.max(-240, Math.min(240, delta)) * .002)));
        const height = width * rect.height / rect.width;
        return { x: base.x + (base.width - width) * ax, y: base.y + (base.height - height) * ay, width, height };
      });
    };
    // Wheel over the map zooms instead of scrolling the page; cancellation requires a non-passive listener.
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, [navigationFitCamera, maxZoom, viewport]);

  function navigate(id: string) { setViewId(id); setCamera(null); }
  function fitView() {
    setCamera(null);
    // Fit returns to the complete asset-level single-line, including local
    // room wiring, so the map can be followed from each supply to its endpoints.
  }
  function zoom(factor: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    const viewportWidth = rect?.width || viewport.width;
    const viewportHeight = rect?.height || viewport.height;
    if (viewportWidth <= 0 || viewportHeight <= 0) return;
    const width = Math.max(navigationFitCamera.width / maxZoom, Math.min(navigationFitCamera.width * 4, camera.width * factor));
    const height = width * viewportHeight / viewportWidth;
    setCamera({ x: camera.x + (camera.width - width) / 2, y: camera.y + (camera.height - height) / 2, width, height });
  }
  function pan(dx: number, dy: number) { setCamera({ ...camera, x: camera.x + dx * camera.width, y: camera.y + dy * camera.height }); }
  function focusAsset(id: string) {
    const [x, y] = view.layout.assets[id] ?? [];
    if (x === undefined || y === undefined || viewport.width <= 0 || viewport.height <= 0) return;
    // Asset search should take the user to the asset itself. Fitting a whole
    // switchroom here made large rooms land at an unreadable map-scale view.
    const contextWidth = Math.max(1400, viewport.width / focusedDetailScale);
    const width = Math.min(navigationFitCamera.width, contextWidth);
    const height = width * viewport.height / viewport.width;
    setCamera({ x: x - width / 2, y: y - height / 2, width, height });
  }
  function readableDetail() {
    focusAsset(selectedId);
  }
  function focusSearchResult(id: string) {
    const assembly=assets.find(a=>a.earthAssembly?.earthAssetId===id);
    focusAsset(assembly?.id??id);
    // Keep the target visible after navigation; the diagram click opens its
    // action popup when the user is ready to operate it.
    selectAsset(id, undefined, !!assembly);
    setAssetSearch('');
  }
  function selectAsset(id: string, element?: Element, openActions = true) {
    if(!labelDrag.current)setSelectedLabelId(undefined);
    const roomLabel = geometry.panels?.find(panel => panel.assetIds.includes(id))?.title;
    onSelectAsset(id, element, roomLabel, openActions && !editMode);
  }
  function keyboard(event: KeyboardEvent<SVGSVGElement>) {
    if (editMode && (dragTarget === 'line' || dragTarget === 'select') && (event.key === 'Delete' || event.key === 'Backspace') && selectedLineSegment !== undefined) {
      event.preventDefault(); removeSelectedSegment(); return;
    }
    if (editMode && event.key === 'Escape') { setBoxSelection({ assets: [], rooms: [] }); setSelectedRoomId(undefined); return; }
    if (event.target !== event.currentTarget) return;
    const actions: Record<string, () => void> = { ArrowLeft: () => pan(-.1, 0), ArrowRight: () => pan(.1, 0), ArrowUp: () => pan(0, -.1), ArrowDown: () => pan(0, .1), '+': () => zoom(.8), '=': () => zoom(.8), '-': () => zoom(1.25), Home: fitView };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  }
  function worldPoint(event: { currentTarget: SVGSVGElement; clientX: number; clientY: number }, savedCamera = camera): [number, number] {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(rect.width / savedCamera.width, rect.height / savedCamera.height);
    return [savedCamera.x + (event.clientX - rect.left - (rect.width - savedCamera.width * scale) / 2) / scale,
      savedCamera.y + (event.clientY - rect.top - (rect.height - savedCamera.height * scale) / 2) / scale];
  }
  function selectionBounds() {
    if (!boxSelection.assets.length && !boxSelection.rooms.length) return undefined;
    const xs: number[] = [], ys: number[] = [];
    for (const id of boxSelection.assets) {
      const point = view.layout.assets[id]; if (!point) continue;
      xs.push(point[0] - 40, point[0] + 40); ys.push(point[1] - 40, point[1] + 40);
      const label = geometry.labels.get(id);
      if (label) { xs.push(label.x, label.x + label.width); ys.push(label.y, label.y + label.height); }
    }
    for (const panel of geometry.panels ?? []) if (boxSelection.rooms.includes(panel.id)) {
      xs.push(panel.x, panel.x + panel.width); ys.push(panel.y, panel.y + panel.height);
    }
    if (!xs.length) return undefined;
    const x = Math.min(...xs) - 30, y = Math.min(...ys) - 30;
    return { x, y, width: Math.max(...xs) - x + 30, height: Math.max(...ys) - y + 30 };
  }
  function startDrag(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0 && event.button !== 1) return;
    const target = event.target instanceof Element ? event.target : null;
    const labelTarget=target?.closest('[data-layout-label-id]');
    const forcePan = event.button === 1 || event.altKey || editMode && (dragTarget === 'pan'||dragTarget==='label'&&!labelTarget);
    if(editMode&&!forcePan&&labelTarget&&(dragTarget==='select'||dragTarget==='label')){
      const id=labelTarget.getAttribute('data-layout-label-id')!,assetId=id.replace(/#earth$/,''),anchor=view.layout.assets[assetId];
      const asset=assets.find(a=>a.id===assetId);if(!anchor||!asset)return;
      let origin:[number,number];
      if(id.endsWith('#earth')){
        const tag=threePositionContacts(asset)?selectorEarthTag(asset):assemblyEarthLabels.get(asset.earthAssembly?.earthAssetId??'')??'';
        const box=turnBox(earthCaptionLayout(tag,appearance.symbolScale),view.layout.objectRotations?.[assetId]??0);
        const p=editor.review.labelPositions?.[id]??[box.x,box.y];origin=[anchor[0]+p[0],anchor[1]+p[1]];
      }else{
        const label=geometry.labels.get(id);if(!label)return;origin=[label.x,label.y];
        if(continuous&&detailLevel!=='detail'&&sourceAssets.has(assetId)){
          const box=(labelTarget.querySelector('rect')??labelTarget).getBoundingClientRect();
          origin=worldPoint({currentTarget:event.currentTarget,clientX:box.left,clientY:box.top});
        }
      }
      event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);setCamera({...camera});
      labelDrag.current={pointerId:event.pointerId,id,assetId,start:worldPoint(event),origin,anchor,before:editor.review,latest:editor.review.labelPositions??{},moved:false};
      selectAsset(assetId,undefined,false);setSelectedLabelId(id);return;
    }
    if (editMode && !forcePan) {
      const line = target?.closest('[data-line-segment]');
      const endpoint = target?.closest('[data-line-endpoint]');
      if ((dragTarget === 'line' || dragTarget === 'select') && !endpoint && line) {
        const id = line?.getAttribute('data-line-id'), index = Number(line?.getAttribute('data-line-segment'));
        const points = id ? geometry.routes.get(id) : undefined;
        if (id && points && Number.isInteger(index)) {
          setSelectedLineId(id);
          setSelectedLineSegment(index); event.currentTarget.focus();
          event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setCamera({ ...camera });
          lineDrag.current = { pointerId: event.pointerId, id, index, points: points.map(p => [...p]), start: worldPoint(event), before: editor.review, latest: editor.review.lineRoutes ?? {}, moved: false };
          setMovingLayout(true);
        }
        return;
      }
      const assetId = target?.closest('[data-layout-asset-id]')?.getAttribute('data-layout-asset-id');
      const roomId = target?.closest('[data-layout-room-id]')?.getAttribute('data-layout-room-id') ?? (assetId ? roomByAsset.get(assetId) : undefined);
      const point = worldPoint(event), bounds = selectionBounds();
      const inSelection = !!bounds && point[0] >= bounds.x && point[0] <= bounds.x + bounds.width && point[1] >= bounds.y && point[1] <= bounds.y + bounds.height;
      const hitSelection = assetId ? boxSelection.assets.includes(assetId) : inSelection && !event.shiftKey;
      const selectRoomTitle = dragTarget === 'select' && !!target?.closest('[data-room-identifier]');
      if (!assetId && !endpoint && !selectRoomTitle && ((dragTarget === 'select' && (!hitSelection || event.shiftKey)) || (dragTarget === 'box' && event.shiftKey))) {
        event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setCamera({ ...camera });
        marqueeDrag.current = { pointerId: event.pointerId, start: point, end: point, camera: { ...camera }, additive: event.shiftKey };
        setMarquee({ start: point, end: point }); return;
      }
      let selection: LayoutBoxSelection = { assets: [], rooms: [] };
      if ((dragTarget === 'box' || dragTarget === 'select' || endpoint) && hitSelection) selection = boxSelection;
      else if ((dragTarget === 'room' || selectRoomTitle) && roomId) {
        const panel = geometry.panels?.find(item => item.id === roomId);
        selection = { assets: [...(panel?.memberAssetIds ?? panel?.assetIds ?? [])], rooms: [] };
      } else if (assetId) selection = { assets: [assetId], rooms: [] };
      if (selection.assets.length || selection.rooms.length) {
        // Derived board frames have no authored room offset. Move the selected
        // frame's actual members rather than persisting its display-only ID.
        selection = {assets:[...new Set([...selection.assets,...(geometry.panels??[]).filter(p=>selection.rooms.includes(p.id)).flatMap(p=>p.memberAssetIds??p.assetIds)])],rooms:[]};
        const rect = event.currentTarget.getBoundingClientRect();
        const scale = Math.min(rect.width / camera.width, rect.height / camera.height);
        if (!Number.isFinite(scale) || scale <= 0) return;
        const covered = new Set((geometry.panels ?? []).filter(panel => selection.rooms.includes(panel.id)).flatMap(panel => panel.memberAssetIds ?? panel.assetIds));
        const movingIds = new Set(selection.assets);
        const snapTargets = connections.flatMap(connection => {
          const fromMoving = movingIds.has(geometry.owners.get(connection.from)!);
          const toMoving = movingIds.has(geometry.owners.get(connection.to)!);
          if (fromMoving === toMoving) return [];
          const route = geometry.routes.get(connection.id)!;
          const movingPoint = fromMoving ? route[0] : route.at(-1)!;
          const fixedPoint = fromMoving ? route.at(-1)! : route[0];
          return [{ x: fixedPoint[0] - movingPoint[0], y: fixedPoint[1] - movingPoint[1], guideX: fixedPoint[0], guideY: fixedPoint[1] }];
        });
        event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setCamera({ ...camera });
        layoutDrag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, scale,
          assets: selection.assets.filter(id => !covered.has(id)), rooms: selection.rooms,
          snapTargets, geometry: positionedGeometry, before: editor.review, latest: editor.review.edits, moved: false };
        setBoxSelection(selection);
        if (assetId) selectAsset(assetId, undefined, false);
        setSelectedRoomId(selection.rooms.length === 1 ? selection.rooms[0] : undefined); setMovingLayout(true); return;
      }
    }
    if (!forcePan && target?.closest('[data-selectable]')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, camera };
  }
  function moveDrag(event: PointerEvent<SVGSVGElement>) {
    if (!labelDrag.current && !lineDrag.current && !layoutDrag.current && !marqueeDrag.current && !drag.current) return;
    pendingPointer.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, shiftKey: event.shiftKey, currentTarget: event.currentTarget };
    if (pointerFrame.current === null) pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = null;
      const point = pendingPointer.current; pendingPointer.current = null;
      if (point) applyDrag(point);
    });
  }
  function applyDrag(event: { pointerId: number; clientX: number; clientY: number; shiftKey: boolean; currentTarget: SVGSVGElement }) {
    const caption=labelDrag.current;
    if(caption?.pointerId===event.pointerId){
      const p=worldPoint(event);let x=caption.origin[0]+p[0]-caption.start[0],y=caption.origin[1]+p[1]-caption.start[1];
      caption.moved ||= Math.abs(p[0]-caption.start[0])+Math.abs(p[1]-caption.start[1])>3/drawingScale;
      if(snapEnabled&&!event.shiftKey){const others=[...geometry.labels].filter(([id])=>id!==caption.id).map(([,l])=>l);x=snapCoordinate(x,others.map(l=>l.x),8/drawingScale).value;y=snapCoordinate(y,others.map(l=>l.y),8/drawingScale).value;}
      caption.latest={...caption.before.labelPositions,[caption.id]:[x-caption.anchor[0],y-caption.anchor[1]]};
      editor.previewLabels(caption.latest);return;
    }
    const movingLine = lineDrag.current;
    if (movingLine?.pointerId === event.pointerId) {
      const point = worldPoint(event), delta: [number, number] = [point[0] - movingLine.start[0], point[1] - movingLine.start[1]];
      movingLine.moved ||= Math.abs(delta[0]) + Math.abs(delta[1]) > 3 / drawingScale;
      const snap = snapEnabled && !event.shiftKey ? snapLineDelta(movingLine.points, movingLine.index, delta, 8 / drawingScale) : { delta };
      setSnapGuides('guide' in snap && snap.guide ? [snap.guide] : []);
      movingLine.latest = { ...movingLine.before.lineRoutes, [movingLine.id]: moveLineSegment(movingLine.points, movingLine.index, snap.delta) };
      editor.previewLines(movingLine.latest); return;
    }
    const selecting = marqueeDrag.current;
    if (selecting?.pointerId === event.pointerId) {
      selecting.end = worldPoint(event, selecting.camera); setMarquee({ start: selecting.start, end: selecting.end }); return;
    }
    const moving = layoutDrag.current;
    if (moving?.pointerId === event.pointerId) {
      let dx = (event.clientX - moving.x) / moving.scale, dy = (event.clientY - moving.y) / moving.scale;
      if (snapEnabled && !event.shiftKey) {
        const sx = snapCoordinate(dx, moving.snapTargets.map(p => p.x), 8 / moving.scale);
        const sy = snapCoordinate(dy, moving.snapTargets.map(p => p.y), 8 / moving.scale);
        dx = sx.value; dy = sy.value;
        const gx = sx.snapped ? moving.snapTargets.find(p => p.x === dx)?.guideX : undefined;
        const gy = sy.snapped ? moving.snapTargets.find(p => p.y === dy)?.guideY : undefined;
        setSnapGuides([...(gx !== undefined ? [{ axis: 'x' as const, value: gx }] : []), ...(gy !== undefined ? [{ axis: 'y' as const, value: gy }] : [])]);
      } else setSnapGuides([]);
      moving.moved ||= Math.abs(event.clientX - moving.x) + Math.abs(event.clientY - moving.y) > 3;
      const next: LayoutEdits = { assets: { ...moving.before.edits.assets }, rooms: { ...moving.before.edits.rooms } };
      for (const [bucket, ids] of [['assets', moving.assets], ['rooms', moving.rooms]] as const) for (const id of ids) {
        let previous = moving.before.edits[bucket][id] ?? [0, 0];
        if(bucket==='assets'&&baseGeometry.hiddenIds?.has(id)){
          const authoredRoom=baseGeometry.panels?.find(p=>(p.memberAssetIds??p.assetIds).includes(id))?.id;
          const roomDelta=moving.before.edits.rooms[authoredRoom??'']??[0,0];
          const current=moving.geometry.view.layout.assets[id],base=baseGeometry.view.layout.assets[id];
          previous=[current[0]-base[0]-roomDelta[0],current[1]-base[1]-roomDelta[1]];
        }
        next[bucket][id] = [previous[0] + dx, previous[1] + dy];
      }
      moving.latest = next;
      // Preview only this gesture's delta against the already positioned scene.
      // Replaying every historical room/asset edit is deferred until drop.
      setPositionPreview(switchroomBuses(applyLayoutEdits(moving.geometry, {
        assets: Object.fromEntries(moving.assets.map(id => [id, [dx, dy]])),
        rooms: Object.fromEntries(moving.rooms.map(id => [id, [dx, dy]])),
      },new Set([...(moving.before.independentAssetPositions??[]),...moving.assets])), editor.review.compactFrames));
      return;
    }
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const panScale = Math.min(rect.width / start.camera.width, rect.height / start.camera.height);
    setCamera({ ...start.camera, x: start.camera.x - (event.clientX - start.x) / panScale, y: start.camera.y - (event.clientY - start.y) / panScale });
  }
  function endDrag(event: PointerEvent<SVGSVGElement>, cancelled = false) {
    if (pointerFrame.current !== null) { cancelAnimationFrame(pointerFrame.current); pointerFrame.current = null; }
    const pending = pendingPointer.current; pendingPointer.current = null;
    // Commit the final pointer position even when release precedes the next frame.
    if (!cancelled && pending) applyDrag(pending);
    const caption=labelDrag.current;
    if(caption?.pointerId===event.pointerId){
      if(cancelled||!caption.moved)editor.previewLabels(caption.before.labelPositions??{});
      else{editor.commitLabels(caption.latest,caption.before);skipClick.current=true;}
      labelDrag.current=null;
    }
    const movingLine = lineDrag.current;
    if (movingLine?.pointerId === event.pointerId) {
      if (cancelled || !movingLine.moved) editor.previewLines(movingLine.before.lineRoutes ?? {});
      else { editor.commitLines({ ...movingLine.latest, [movingLine.id]: simplifyLineRoute(movingLine.latest[movingLine.id]) }, movingLine.before); setSelectedLineSegment(undefined); skipClick.current = true; }
      lineDrag.current = null; setMovingLayout(false);
    }
    const selecting = marqueeDrag.current;
    if (selecting?.pointerId === event.pointerId) {
      if (!cancelled) {
        const selected = selectLayoutBox(geometry, selecting.start, worldPoint(event, selecting.camera));
        setBoxSelection(previous => selecting.additive ? { assets: [...new Set([...previous.assets, ...selected.assets])], rooms: [...new Set([...previous.rooms, ...selected.rooms])] } : selected);
        setSelectedRoomId(undefined); skipClick.current = true;
      }
      marqueeDrag.current = null; setMarquee(undefined);
    }
    const moving = layoutDrag.current;
    if (moving?.pointerId === event.pointerId) {
      if (!cancelled && moving.moved) { editor.commitEdits(moving.latest, moving.before, moving.assets); skipClick.current = true; }
      setPositionPreview(undefined);
      layoutDrag.current = null; setMovingLayout(false);
    }
    drag.current = null;
    setSnapGuides([]);
  }
  const selectedBounds = editMode ? selectionBounds() : undefined;
  const deletionSelection = boxSelection.assets.length ? boxSelection.assets : [selectedId];
  const selectionMarked = deletionSelection.every(id => editor.review.markedForDeletion.includes(id));
  function removeSelectedSegment() {
    const points = selectedLineId ? geometry.routes.get(selectedLineId) : undefined;
    if (!selectedLineId || selectedLineSegment === undefined || !points || points.length < 3) return;
    editor.commitLines({ ...editor.review.lineRoutes, [selectedLineId]: removeLineSegment(points, selectedLineSegment) }, editor.review);
    setSelectedLineSegment(undefined);
  }
  function centreBusEarths() {
    const moves = drawingBusEarthMoves(geometry);
    const edits = { assets: { ...editor.review.edits.assets }, rooms: { ...editor.review.edits.rooms } };
    const takeoffs = { ...editor.review.busTakeoffs }, lineRoutes = { ...editor.review.lineRoutes };
    for (const move of moves) {
      const offset = edits.assets[move.assetId] ?? [0, 0];
      edits.assets[move.assetId] = [offset[0] + move.delta[0], offset[1] + move.delta[1]];
      takeoffs[move.connectionId] = move.fraction; delete lineRoutes[move.connectionId];
    }
    editor.commitBusEarths(edits, takeoffs, lineRoutes);
  }
  function resetLineAt(event: { currentTarget: SVGSVGElement; clientX: number; clientY: number }) {
    if (!editMode || dragTarget !== 'line' && dragTarget !== 'select') return;
    const [x, y] = worldPoint(event);
    let nearest: string | undefined, distance = 14 / drawingScale;
    for (const [id, points] of geometry.routes) for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const px = Math.max(Math.min(a[0], b[0]), Math.min(Math.max(a[0], b[0]), x));
      const py = Math.max(Math.min(a[1], b[1]), Math.min(Math.max(a[1], b[1]), y));
      const d = Math.hypot(x - px, y - py);
      if (d < distance) { distance = d; nearest = id; }
    }
    if (nearest) { const routes = { ...editor.review.lineRoutes }; delete routes[nearest]; editor.commitLines(routes, editor.review); setSelectedLineSegment(undefined); }
  }

  return <main className={`diagram-panel interactive-diagram${continuous ? ' whole-network' : ''}${editMode ? ' layout-edit-mode' : ''}`}>
    <div className="panel-heading"><h2>{continuous ? 'Whole network · single-line diagram' : 'Single-line diagram'}</h2><p className={continuous && cameraOverride && focusedPanel ? 'focused-context' : undefined}>{continuous && cameraOverride && focusedPanel ? `Viewing ${focusedPanel.title} · ${labels.get(selectedId) ?? selectedId}` : continuous && semanticZoom === 'overview' ? `${assets.length} assets · ${connections.length} modeled connections · zoom in for asset labels and switching detail` : continuous ? `${assets.length} assets · ${connections.length} connections · supplies at the top, feeders downward` : snapshot.model.name}</p></div>
    {continuous ? <div className="canvas-navigation">
      <label>Find an asset<input aria-label="Find asset on whole network" value={assetSearch} onChange={event => setAssetSearch(event.target.value)} placeholder="Search asset tag or name" onKeyDown={event => { if (event.key === 'Enter' && matchingAssets[0]) focusSearchResult(matchingAssets[0].id); }} /></label>
      {assetSearch.trim() && <div className="asset-search-results" aria-label="Matching network assets">{matchingAssets.map(asset => {
        const room = geometry.panels?.find(panel => panel.assetIds.includes(asset.id))?.title;
        return <button key={asset.id} onClick={() => focusSearchResult(asset.id)}><span>{currentAssetLabel(snapshot.model, asset)}</span>{room && <small>Within {room}</small>}</button>;
      })}{!matchingAssets.length && <p>No matching assets.</p>}</div>}
    </div> : <>{presentation.views.length > 12 && <div className="view-search"><label>Find view<input aria-label="Find network view" value={viewSearch} onChange={event => setViewSearch(event.target.value)} placeholder="Area or view name" /></label>{viewSearch && <button onClick={() => setViewSearch('')}>Clear view search</button>}<span>{matchingViews.length} of {presentation.views.length} views</span></div>}
    <nav className="view-navigation" aria-label="Network views">{matchingViews.map(item => <button key={item.id} aria-current={item.id === viewId ? 'page' : undefined} onClick={() => navigate(item.id)}>{item.label}</button>)}{!matchingViews.length && <p>No matching views. Clear the search to see all views.</p>}</nav></>}
    <div className="diagram-toolbar" aria-label="Diagram navigation">
      <div className="zoom-controls"><button aria-label="Zoom out" onClick={() => zoom(1.25)} disabled={camera.width >= fitCamera.width * 4}>−</button><output aria-label="Diagram zoom">{zoomPercent}</output><button aria-label="Zoom in" onClick={() => zoom(.8)} disabled={camera.width <= fitCamera.width / maxZoom}>+</button><button onClick={fitView}>Fit view</button>{continuous && <button onClick={readableDetail}>Focus selected asset</button>}</div>
      {continuous && <button aria-pressed={editMode} onClick={() => { if(editMode){setEditMode(false);selectAsset(selectedId,undefined,false);}else{setEditPassword('');setEditPasswordError('');setEditUnlockOpen(true);} }}>{editMode ? 'Finish editing' : 'Edit layout'}</button>}
      <div className="pan-controls" aria-label="Pan diagram"><button aria-label="Pan left" onClick={() => pan(-.1, 0)}>←</button><button aria-label="Pan up" onClick={() => pan(0, -.1)}>↑</button><button aria-label="Pan down" onClick={() => pan(0, .1)}>↓</button><button aria-label="Pan right" onClick={() => pan(.1, 0)}>→</button></div>
    </div>
    {editUnlockOpen && <div className="edit-unlock-backdrop"><section className="edit-unlock-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-unlock-title" onKeyDown={event=>{if(event.key==='Escape')closeEditUnlock();}}>
      <h2 id="edit-unlock-title">Unlock layout editing</h2>
      <form onSubmit={event=>{event.preventDefault();void unlockEditing();}}>
        <label>Editing password<input autoFocus type="password" autoComplete="off" value={editPassword} onChange={event=>setEditPassword(event.target.value)} /></label>
        {editPasswordError&&<p role="alert">{editPasswordError}</p>}
        <div><button type="button" onClick={closeEditUnlock}>Cancel</button><button type="submit" disabled={editUnlockBusy||!editPassword}>{editUnlockBusy?'Checking…':'Unlock editing'}</button></div>
      </form>
    </section></div>}
    {editMode && <div className="layout-edit-toolbar" aria-label="Layout editing">
      <label>Line weight <select aria-label="Line weight" value={appearance.lineWidth} onChange={event => editor.setAppearance({ ...appearance, lineWidth: Number(event.target.value) })}>
        <option value={1.4}>Fine</option><option value={2}>Medium</option><option value={3}>Bold</option><option value={4}>Extra bold</option>
      </select></label>
      <label>Symbol size <select aria-label="Symbol size" value={appearance.symbolScale} onChange={event => editor.setAppearance({ ...appearance, symbolScale: Number(event.target.value) })}>
        <option value={1}>100%</option><option value={1.5}>150%</option><option value={2}>200%</option><option value={2.5}>250%</option><option value={3}>300%</option><option value={4}>400%</option>
      </select></label>
      <label>Text size <select aria-label="Text size" value={textScale} onChange={event => editor.setAppearance({ ...appearance, textScale: Number(event.target.value) })}>
        <option value={1}>100%</option><option value={1.5}>150%</option><option value={2}>200%</option><option value={2.5}>250%</option><option value={3}>300%</option>
      </select></label>
      <label><input type="checkbox" checked={snapEnabled} onChange={event => setSnapEnabled(event.target.checked)} />Snap alignment</label>
      <small>Hold Shift while dragging for free placement.</small>
      <label>Tool <select aria-label="Drag target" value={dragTarget} onChange={event => { const value = event.target.value; setDragTarget(value === 'select' || value === 'room' || value === 'asset' || value === 'line' || value === 'label' || value === 'pan' ? value : 'box'); setSelectedRoomId(undefined); setBoxSelection({ assets: [], rooms: [] }); }}><option value="select">Select</option><option value="box">Box select and move</option><option value="asset">Single asset</option><option value="room">Whole switchroom</option><option value="line">Route lines</option><option value="label">Move labels</option><option value="pan">Pan</option></select></label>
      <button onClick={editor.undo} disabled={!editor.canUndo}>Undo layout change</button>
      <button onClick={centreBusEarths}>Use drawing bus-earth positions</button>
      <button onClick={() => { const compact = condensePositions(geometry, editor.review.edits); editor.condense(compact.edits, compact.routes); }}>Condense spacing 15%</button>
      {(dragTarget === 'line' || dragTarget === 'select') && <button onClick={removeSelectedSegment} disabled={selectedLineSegment === undefined || !selectedLineId || (geometry.routes.get(selectedLineId)?.length ?? 0) < 3}>Remove selected segment</button>}
      <button onClick={editor.resetPositions}>Reset positions</button><button onClick={() => editor.rotateAsset(selectedId,-90)} disabled={boxSelection.assets.length>1}>Rotate left</button><button onClick={() => editor.rotateAsset(selectedId,90)} disabled={boxSelection.assets.length>1}>Rotate right</button><output aria-label="Object rotation">{editor.review.rotations?.[selectedId]??0}°</output><button onClick={() => editor.rotateAsset(selectedId,-(editor.review.rotations?.[selectedId]??0))} disabled={!editor.review.rotations?.[selectedId]||boxSelection.assets.length>1}>Reset rotation</button>
      <button onClick={()=>editor.hideLabel(selectedLabelId??selectedId)} disabled={!(selectedLabelId??selectedId)||editor.review.hiddenLabels?.includes(selectedLabelId??selectedId)}>Delete selected label</button>
      <button onClick={()=>editor.restoreLabels()} disabled={!editor.review.hiddenLabels?.length}>Restore deleted labels{editor.review.hiddenLabels?.length?` (${editor.review.hiddenLabels.length})`:''}</button>
      <button onClick={()=>editor.resetLabel(selectedLabelId??selectedId)} disabled={!editor.review.labelPositions?.[selectedLabelId??selectedId]}>Reset selected label</button>
      <span role="status">{boxSelection.assets.length ? `${boxSelection.assets.length} assets selected` : `Selected: ${labels.get(selectedId)}`}</span><button onClick={() => { setBoxSelection({ assets: [], rooms: [] }); setSelectedRoomId(undefined); }}>Clear selection</button>
      <button onClick={() => editor.markSelection(deletionSelection, !selectionMarked)}>{selectionMarked ? 'Unmark selection' : boxSelection.assets.length > 1 ? 'Mark selection for deletion' : 'Mark selected asset for deletion'}</button>
      <form onSubmit={event => { event.preventDefault(); const field = event.currentTarget.elements.namedItem('assetName') as HTMLInputElement; editor.rename(selectedId, field.value); }}><label>Object name <input key={selectedId + (editor.review.names?.[selectedId] ?? '')} name="assetName" aria-label="Object name" maxLength={160} defaultValue={editor.review.names?.[selectedId] ?? ''} placeholder="Custom name (blank restores default)" /></label><button type="submit">Save name</button></form>
      <button onClick={editor.download}>Download review</button>
      <small>{dragTarget === 'select' ? 'Drag empty space to box-select. Drag a label to move text only. Drag an asset or selected group to move it; drag a line to reroute it. Drag a switchroom title to move its contents. Shift adds; Alt-drag pans.' : dragTarget === 'line' ? 'Click a segment, then Delete / Remove selected segment to join its neighbours. Round end handles resize the line. Drag an end handle to shorten/lengthen it: the attached asset (or selected group) moves with it. Drag the line sideways to change its route. Double-click restores its automatic route. Drag empty space to pan; Alt-drag always pans.' : 'Drag empty space to pan. Shift-drag a box to select objects; drag inside the selection to move them together. Shift adds; Alt-drag always pans.'}</small><small role="status">{editor.saveStatus}</small>
      <details className="deletion-review"><summary>Deletion marks ({editor.review.markedForDeletion.length})</summary><p>Marked assets remain connected until the reviewed batch deletion.</p>{editor.review.markedForDeletion.map(id => <div key={id}><button onClick={() => focusSearchResult(id)}>{labels.get(id) ?? id}</button><button aria-label={`Unmark ${labels.get(id) ?? id}`} onClick={() => editor.toggleMark(id)}>Unmark</button></div>)}</details>
    </div>}
    <p className={`navigation-help${continuous && detailLevel !== 'detail' ? ' has-hidden-labels' : ''}`}>{continuous && detailLevel !== 'detail' ? 'Full network single-line · Zoom in for asset labels and switching controls. ' : ''}Scroll to zoom · Drag to pan · Arrow keys to move · Home to fit</p>
    {!selectedVisible && <div className="outside-selection"><span>{labels.get(selectedId)} is outside this view. Its inspection and paths remain active.</span><button onClick={() => navigate(presentation.views.find(item => item.id !== presentation.overviewId && item.assetIds.includes(selectedId))?.id ?? presentation.overviewId)}>Show selected asset</button></div>}
    <div className="diagram-surface">
      <svg ref={svgRef} data-line-weight={appearance.lineWidth > 1.4 ? 'custom' : 'fine'} style={{ '--diagram-wire-width': appearance.lineWidth, '--diagram-symbol-width': Math.max(1.3, appearance.lineWidth * .85) } as CSSProperties} className={`network-diagram map-level-${detailLevel}${contextLabelLevel ? ' map-level-context' : ''}`} data-scale={drawingScale} data-label-editing={editMode} viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`} aria-label={`${view.label} single-line diagram`} tabIndex={0} onKeyDown={keyboard} onDoubleClick={resetLineAt} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={event => endDrag(event)} onPointerCancel={event => endDrag(event, true)} onClickCapture={event => { if (skipClick.current) { event.preventDefault(); event.stopPropagation(); skipClick.current = false; } }}>
        <title>{view.label} single-line diagram</title>
        {geometry.panels?.map(panel => {
          const overview = drawingScale < .06;
          const plan = identifierLayouts.get(panel.id)!;
          const frameBounds = plan.bounds, placement = plan.placement;
          const title = placement?.caption ?? panel.overviewTitle;
          const titleX = placement ? placement.x + (placement.vertical ? placement.font * .9 : 0) : 0;
          const titleY = placement ? placement.y + (placement.vertical ? placement.height : placement.font * .9) : 0;
          return <g key={panel.id} className={`canvas-area${editMode && (selectedRoomId === panel.id || boxSelection.rooms.includes(panel.id)) ? ' selected-layout-room' : ''}`} data-layout-room-id={panel.id} data-switchroom={panel.label}>
            <title>{panel.label} · {(panel.memberAssetIds ?? panel.assetIds).length} modeled assets</title>
            <rect x={frameBounds.x} y={frameBounds.y} width={frameBounds.width} height={frameBounds.height} rx="8" className={overview ? 'overview-room-frame' : undefined} />
            {placement && <text
              data-room-identifier={panel.id}
              data-title-bounds={`${placement.x},${placement.y},${placement.width},${placement.height}`}
              x={titleX} y={titleY}
              transform={placement.vertical ? `rotate(-90 ${titleX} ${titleY})` : undefined}
              style={{ fontSize: placement.font, strokeWidth: 2 }}
            >{title}</text>}
          </g>;
        })}
        {geometry.referenceBounds && <g className="reference-area" aria-label={geometry.referenceLabel}>
          <title>{geometry.referenceLabel}</title>
          <rect x={geometry.referenceBounds.x} y={geometry.referenceBounds.y} width={geometry.referenceBounds.width} height={geometry.referenceBounds.height} rx="8" />
          {drawingScale >= .06 && <text x={geometry.referenceBounds.x + 16} y={geometry.referenceBounds.y + 20 / drawingScale} style={{ fontSize: 14 / drawingScale }}>Other references</text>}
        </g>}
        {view.regions?.map(region => {
          const [x, y, width, height] = region.bounds;
          const fontSize = Math.min(width / 12, height / 8);
          return <g key={`region:${region.id}`} className="diagram-region" role="button" tabIndex={0} data-selectable="true" aria-label={`Open area ${region.label}`} onClick={() => navigate(region.targetViewId)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(region.targetViewId); } }}>
            <title>{region.label} — open detailed area view</title>
            <rect x={x} y={y} width={width} height={height} rx={25} />
            <text x={x + width / 2} y={y + fontSize + 15} textAnchor="middle" fontSize={fontSize}>{region.label.split('\n').map((line, index) => <tspan key={index} x={x + width / 2} dy={index === 0 ? 0 : fontSize * 1.1}>{line}</tspan>)}</text>
          </g>;
        })}
        {renderedConnections.map(connection => {
          const fragments = conductorFragments.get(connection.id) ?? [geometry.routes.get(connection.id)!];
          const conflict = snapshot.conflicts.some(item => item.connectionIds.includes(connection.id));
          const result = snapshot.connectionResults[connection.id];
          const unconfirmedConnection = !isSupported(snapshot.model, connection);
          return <g key={connection.id} data-connection-id={connection.id} data-from={connection.from} data-to={connection.to} data-tree-edge={geometry.treeEdgeIds?.has(connection.id)}><title>{connection.id}{unconfirmedConnection ? ' — Connection record unconfirmed' : ' — Connection record supported'}; source: {result.sourceStatus}; earth: {result.earthStatus}</title>{fragments.map((fragment, index) => <polyline key={`${connection.id}:${index}`} points={fragment.map(point => point.join(',')).join(' ')} className={`wire ${result.sourceStatus === 'connected' ? 'connected' : 'disconnected'} ${result.earthStatus === 'connected' ? 'earthed' : ''} ${result.sourceStatus === 'unconfirmed' && result.earthStatus !== 'connected' ? 'unconfirmed-source' : ''} ${unconfirmedConnection ? 'unconfirmed-connection' : ''} ${removedEdges.has(`connection:${connection.id}`) ? 'change-outline' : ''} ${conflict ? 'conflict' : ''} ${tracedPath?.connectionIds.includes(connection.id) ? 'traced' : ''}`} />)}</g>;
        })}
        {editMode && (dragTarget === 'line' || dragTarget === 'select') && renderedConnections.flatMap(connection => {
          const points = geometry.routes.get(connection.id) ?? [];
          return points.slice(1).map((to, index) => {
            const from = points[index];
            if (from[0] === to[0] && from[1] === to[1]) return null;
            return <line key={`${connection.id}:handle:${index}`} className={`line-route-handle${connection.id === selectedLineId && index === selectedLineSegment ? ' selected-line-segment' : ''}`} data-line-id={connection.id} data-line-segment={index}
              x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} style={{ cursor: from[1] === to[1] ? 'ns-resize' : 'ew-resize' }}
              >
              <title>Click to select this segment, then press Delete or Remove selected segment to reconnect its neighbours. Drag to reroute. Double-click restores the automatic route.</title>
            </line>;
          });
        })}
        {displayedAssets.map(item => {
          const [x, y] = view.layout.assets[item.id];
          const label = geometry.labels.get(item.id)!;
          return <g key={item.id} data-asset-id={item.id} data-asset-kind={item.kind} data-field-equipment={item.kind === 'transformer' || isMotor(item) ? 'true' : undefined} data-layout-asset-id={item.id} transform={`translate(${x},${y})`} role="button" tabIndex={0} data-selectable="true" aria-label={`Select ${currentAssetLabel(snapshot.model, item)} on diagram`} aria-pressed={item.id === selectedId} className={`diagram-asset${roomByAsset.has(item.id) ? ' room-member' : ''}${editor.review.markedForDeletion.includes(item.id) ? ' marked-for-deletion' : ''}`} onClick={event => selectAsset(item.id, event.currentTarget)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectAsset(item.id, event.currentTarget); } }}>
            {contextLabelLevel ? null : hasDeviceCard(item) ? <rect className="device-card" {...(tieSymbols.tieIds.has(item.id)?{x:-44*appearance.symbolScale,y:-24*appearance.symbolScale,width:88*appearance.symbolScale,height:48*appearance.symbolScale}:deviceCard(item, [x, y], label, appearance.symbolScale, view.layout.objectRotations?.[item.id]))} rx="6" /> : null}
            <title>{currentAssetLabel(snapshot.model, item)}</title>
            <rect x="-38" y="-38" width="76" height="76" rx="6" className={item.id === selectedId || editMode && boxSelection.assets.includes(item.id) ? 'selection active' : 'selection'} />
            {editor.review.markedForDeletion.includes(item.id) && <g className="deletion-mark"><rect x="-48" y="-48" width="96" height="96" rx="8" /><path d="M-38-38 L38 38 M38-38 L-38 38" /><title>Marked for deletion · still connected</title></g>}
            {continuous && detailLevel !== 'detail' && item.kind !== 'bus'
              ? <g transform={`scale(${Math.max(1, (semanticZoom === 'overview' ? 3 : 10) / (60 * drawingScale))})`}>{semanticZoom === 'overview'
                ? <circle className="overview-asset-marker" r="30" aria-hidden="true" />
                : <EquipmentSymbol diagramScale={drawingScale} symbolScale={appearance.symbolScale} asset={item} state={snapshot.devices[item.id]} busTie={tieSymbols.tieIds.has(item.id)} busBar={tieSymbols.bars.get(item.id)} earthState={item.earthAssembly?snapshot.devices[item.earthAssembly.earthAssetId]:undefined} hideEarthLabel={editor.review.hiddenLabels?.includes(item.id+'#earth')} earthLabelPosition={editor.review.labelPositions?.[item.id+'#earth']} earthLabel={item.earthAssembly?assemblyEarthLabels.get(item.earthAssembly.earthAssetId):undefined} layout={view.layout} inline={geometry.inlineIds?.has(item.id)} />}</g>
              : <EquipmentSymbol diagramScale={drawingScale} symbolScale={appearance.symbolScale} asset={item} state={snapshot.devices[item.id]} busTie={tieSymbols.tieIds.has(item.id)} busBar={tieSymbols.bars.get(item.id)} earthState={item.earthAssembly?snapshot.devices[item.earthAssembly.earthAssetId]:undefined} hideEarthLabel={editor.review.hiddenLabels?.includes(item.id+'#earth')} earthLabelPosition={editor.review.labelPositions?.[item.id+'#earth']} earthLabel={item.earthAssembly?assemblyEarthLabels.get(item.earthAssembly.earthAssetId):undefined} layout={view.layout} inline={geometry.inlineIds?.has(item.id)} />}
            {isDrive(item) && <g className="winding-labels">{driveInputCaptions(item, appearance.symbolScale).map(caption => <text key={caption.lines[0]} x={caption.x + caption.width / 2} y={caption.y + caption.height * .8} textAnchor="middle" style={{fontSize:14 * appearance.symbolScale}}>{caption.lines[0]}</text>)}</g>}
          </g>;
        })}
        {displayedAssets.map(item => {
          // The initial ResizeObserver pass can render with a zero-sized SVG.
          // Do not divide source-marker dimensions by a zero scale; that
          // produced Infinity/NaN SVG attributes before the first layout.
          if (continuous && !scaleReady) return null;
          const [x, y] = view.layout.assets[item.id];
          // Keep source markers and their IDs stable through the overview and
          // structure bands. Without this, the first zoom step hid the tag and
          // shrank the same symbol at once, making the source appear to vanish.
          const sourceMarker = continuous && detailLevel !== 'detail' && sourceAssets.has(item.id);
          const sourceTag = item.label.split(/[ ·\n]/)[0];
          const selectedContextLabel = contextLabelLevel && item.id === selectedId && !sourceMarker;
          const localContextLabel = contextLabelLevel && !selectedContextLabel ? contextLabels.get(item.id) : undefined;
          if (continuous && semanticZoom === 'overview' && !sourceMarker) return null;
          // The context placement pass deliberately drops labels that would
          // overlap another label or wire. Falling back to the full drawing
          // labels here defeats that collision check and turns the whole map
          // into a pile of overlapping tags at the first zoom step.
          if (contextLabelLevel && !sourceMarker && !selectedContextLabel && !localContextLabel) return null;
          const sourceLabelLeft = sourceMarker && [...sourceAssets].some(id=>{const p=view.layout.assets[id];return id!==item.id&&p&&p[0]>x&&(p[0]-x)*drawingScale<72&&Math.abs(p[1]-y)*drawingScale<24;});
          let label = sourceMarker
            ? { x: x + (sourceLabelLeft ? -60 : 12) / drawingScale, y: y - 9 / drawingScale, width: 48 / drawingScale, height: 18 / drawingScale, lines: [sourceTag] }
            : selectedContextLabel
              ? { x: x + 54 / drawingScale, y: y - 18 / drawingScale, width: 176 / drawingScale, height: 38 / drawingScale, lines: [item.label.split('\n')[0].slice(0, 28)] }
              : localContextLabel ?? geometry.labels.get(item.id)!;
          if (!label || editor.review.hiddenLabels?.includes(item.id)) return null;
          const manual=editor.review.labelPositions?.[item.id];
          if(sourceMarker&&manual)label={...label,x:x+manual[0],y:y+manual[1]};
          const state = snapshot.devices[item.id];
          const card=hasDeviceCard(item)?deviceCard(item,[x,y],label,appearance.symbolScale,view.layout.objectRotations?.[item.id]):undefined;
          const leader=card&&!contextLabelLevel?captionLeader({x:x+card.x,y:y+card.y,width:card.width,height:card.height},label):undefined;
          return <g key={`label:${item.id}`} data-layout-label-id={item.id} data-layout-asset-id={item.id} className={`asset-label${hasDeviceCard(item) ? ' card-label' : ''}${sourceMarker ? ' source-marker-label' : ''}${selectedContextLabel ? ' selected-context-label' : ''}${localContextLabel ? ' context-local-label' : ''}${editor.review.markedForDeletion.includes(item.id) ? ' marked-for-deletion' : ''}`} role="button" tabIndex={0} data-selectable="true" aria-label={`Inspect ${currentAssetLabel(snapshot.model, item)} label`} onClick={event => selectAsset(item.id, event.currentTarget)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectAsset(item.id, event.currentTarget); } }}>
            {leader && <polyline data-caption-owner={item.id} points={leader.map(p=>p.join(',')).join(' ')} fill="none" stroke="#60758d" strokeWidth="1" vectorEffect="non-scaling-stroke" pointerEvents="none" aria-hidden="true" />}
            <title>{currentAssetLabel(snapshot.model, item)}</title><rect x={label.x} y={label.y} width={label.width} height={label.height} rx="4" style={sourceMarker ? { stroke: '#486079', strokeWidth: 1 / drawingScale } : undefined} />
            <text x={label.x + label.width / 2} y={label.y + (sourceMarker ? 12 / drawingScale : selectedContextLabel || localContextLabel ? 13 / drawingScale : continuous ? 33 * textScale : 21 * textScale)} textAnchor="middle" style={sourceMarker || selectedContextLabel || localContextLabel ? { fontSize: (sourceMarker ? 9 : 11) / drawingScale } : { fontSize: (continuous ? 33 : 21) * textScale }}>{label.lines.map((line, index) => <tspan key={index} x={label.x + label.width / 2} dy={index ? selectedContextLabel || localContextLabel ? 13 / drawingScale : continuous ? 35 * textScale : 21 * textScale : 0}>{line}</tspan>)}</text>
            {state !== undefined && !localContextLabel && <text x={label.x + label.width / 2} y={label.y + label.height - (continuous ? 8 * textScale : 6 * textScale)} textAnchor="middle" className="position-label" style={selectedContextLabel ? { fontSize: 8 / drawingScale } : { fontSize: (continuous ? 24 : 14) * textScale }}>{isIndependentState(state) ? `${capitalState(state.contact ?? 'Unconfirmed')} · Rack ${capitalState(state.racking ?? 'Unconfirmed')}` : capitalState(state ?? 'Unconfirmed')}</text>}
            {state === undefined && isFuse(item) && <title>Healthy (Closed) · intact fixed fuse in the selected V1 model.</title>}
          </g>;
        })}
        {view.boundaries?.map(boundary => <g key={boundary.connectionId} data-selectable="true" role="button" tabIndex={0} className="boundary-port" aria-label={`Follow ${boundary.connectionId} to ${labels.get(boundary.remoteAssetId)}`} transform={`translate(${boundary.position.join(',')})`} onClick={() => navigate(boundary.targetViewId)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(boundary.targetViewId); } }}><title>{boundary.connectionId} → {labels.get(boundary.remoteAssetId)}</title><circle r="12" /><text textAnchor="middle" y="5">↗</text></g>)}
        {editMode && (dragTarget === 'line' || dragTarget === 'select') && selectedLineId && (() => {
          const connection = connections.find(item => item.id === selectedLineId), route = geometry.routes.get(selectedLineId);
          if (!connection || !route) return null;
          return ([['from', connection.from, route[0]], ['to', connection.to, route.at(-1)!]] as const).map(([end, terminal, point]) => {
            const owner = geometry.owners.get(terminal)!;
            // Shared buses are not line-length handles: moving a bus affects
            // all of its taps. The other endpoint remains available.
            if (assets.find(asset => asset.id === owner)?.kind === 'bus') return null;
            return <circle key={end} className="line-endpoint-handle" data-line-endpoint={end} data-layout-asset-id={owner}
              cx={point[0]} cy={point[1]} r={7 / drawingScale} role="button" tabIndex={0}
              aria-label={`Move ${labels.get(owner) ?? owner} endpoint to shorten or lengthen line`}>
              <title>Drag to shorten/lengthen: moves {labels.get(owner) ?? owner}, or its selected group. Undo restores the position.</title>
            </circle>;
          });
        })()}
        {snapGuides.map(guide => <line key={guide.axis} className="alignment-snap-guide" data-snap-axis={guide.axis}
          x1={guide.axis === 'x' ? guide.value : camera.x} x2={guide.axis === 'x' ? guide.value : camera.x + camera.width}
          y1={guide.axis === 'y' ? guide.value : camera.y} y2={guide.axis === 'y' ? guide.value : camera.y + camera.height} />)}
        {selectedBounds && <rect className="layout-selection-box" data-layout-selection="true" {...selectedBounds} />}
        {marquee && <rect className="layout-marquee" x={Math.min(marquee.start[0], marquee.end[0])} y={Math.min(marquee.start[1], marquee.end[1])} width={Math.abs(marquee.end[0] - marquee.start[0])} height={Math.abs(marquee.end[1] - marquee.start[1])} />}
      </svg>
    </div>
    {!!view.boundaries?.length && <section className="boundary-list" aria-label="Connections beyond this view"><h3>Connections beyond this view</h3>{view.boundaries.map(boundary => <button key={boundary.connectionId} onClick={() => navigate(boundary.targetViewId)}><strong>{boundary.connectionId}</strong><span>→ {labels.get(boundary.remoteAssetId)} · {presentation.views.find(item => item.id === boundary.targetViewId)?.label}</span></button>)}</section>}
    <div className="legend" aria-label="Diagram legend"><span><i className="dot connected" />Source connected</span><span><i className="dot disconnected" />No source connection</span>{snapshot.model.earths?.length ? <span><i className="dot earth-dot" />Earth connected</span> : null}{connections.some(connection => !isSupported(snapshot.model, connection)) && <span><i className="dot unconfirmed-dot" />Amber line: connection record unconfirmed</span>}{snapshot.model.assets.some(asset => asset.sourceArcs?.length) && <span>Winding transfer and earth relationships: inspect Asset details</span>}{snapshot.conflicts.length > 0 && <span><i className="dot conflict-dot" />Source-to-earth conflict</span>}{snapshot.impact.length > 0 && <span><i className="dot impact-dot" />Changed path</span>}{tracedPath && <span><i className="dot trace-dot" />Selected supply path</span>}</div>
  </main>;
}









































