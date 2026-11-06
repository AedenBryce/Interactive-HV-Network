import { useState } from 'react';

import type { LayoutEdits } from './layout-edit';

import type { LineRoutes } from './line-routing';

import { validateDiagramAppearance } from './diagram-appearance';

import type { DiagramAppearance } from './diagram-appearance';

import { validateBusTakeoffs } from './bus-earth-layout';

import type { BusTakeoffs } from './bus-earth-layout';

import { createLayoutReviewDocument, initialLayoutReview, layoutReviewStorageKey, parseLayoutReviewDocument } from './layout-review';

import type { LayoutReviewDocument, LayoutReviewIdentity } from './layout-review';


export function useLayoutReview(identity: LayoutReviewIdentity, assetIds: string[], roomIds: string[]) {

  const key = layoutReviewStorageKey(identity);

  const [initialReview] = useState(() => initialLayoutReview(identity, assetIds, roomIds));

  const [saveStatus, setSaveStatus] = useState('Drag to move. Download review to share positions, line routes and deletion marks.');

  const [review, setReview] = useState<LayoutReviewDocument>(() => {

    try {

      const saved = localStorage.getItem(key);

      if (saved) return parseLayoutReviewDocument(saved, identity, assetIds, roomIds);

    } catch { /* Keep an unreadable saved file intact; start with the authored drawing. */ }

    return initialReview;

  });

  const [history, setHistory] = useState<LayoutReviewDocument[]>([]);

  function save(next: LayoutReviewDocument) {

    try { localStorage.setItem(key, JSON.stringify(next)); setSaveStatus('Saved in this browser.'); }

    catch { setSaveStatus('Browser storage unavailable. Download the review to keep your changes.'); }

  }

  function commit(next: LayoutReviewDocument, before = review) {
    if(next.rotations===undefined&&before.rotations)next={...next,rotations:before.rotations};
    if(next.independentAssetPositions===undefined&&before.independentAssetPositions)next={...next,independentAssetPositions:before.independentAssetPositions};
    next={...next,manualLineRoutes:(next.manualLineRoutes??before.manualLineRoutes??[]).filter(id=>Object.hasOwn(next.lineRoutes??{},id))};

    if (next.names === undefined && before.names) next = { ...next, names: before.names };
    if(next.hiddenLabels===undefined&&before.hiddenLabels)next={...next,hiddenLabels:before.hiddenLabels};
    if(next.labelPositions===undefined&&before.labelPositions)next={...next,labelPositions:before.labelPositions};

    if (next.appearance === undefined && before.appearance) next = { ...next, appearance: before.appearance };

    if (next.busTakeoffs === undefined && before.busTakeoffs) next = { ...next, busTakeoffs: before.busTakeoffs };

    if (next.compactFrames === undefined && before.compactFrames !== undefined) next = { ...next, compactFrames: before.compactFrames };
    if (next.framePaddingScale === undefined && before.framePaddingScale !== undefined) next = { ...next, framePaddingScale: before.framePaddingScale };

    if (JSON.stringify(next) === JSON.stringify(before)) { setReview(next); return; }

    setHistory(items => [...items, before].slice(-50)); setReview(next); save(next);

  }

  function preview(edits: LayoutEdits) { setReview(current => ({ ...current, edits })); }

  function commitEdits(edits: LayoutEdits, before: LayoutReviewDocument, movedAssets: string[] = []) {

    commit({...createLayoutReviewDocument(identity, edits, before.markedForDeletion, before.lineRoutes),independentAssetPositions:[...new Set([...(before.independentAssetPositions??[]),...movedAssets])]}, before);

  }

  function toggleMark(id: string) {

    const marks = review.markedForDeletion.includes(id) ? review.markedForDeletion.filter(item => item !== id) : [...review.markedForDeletion, id];

    commit(createLayoutReviewDocument(identity, review.edits, marks, review.lineRoutes));

  }

  function markSelection(ids: string[], marked: boolean) {

    const marks = new Set(review.markedForDeletion);

    for (const id of ids) { if (marked) marks.add(id); else marks.delete(id); }

    commit(createLayoutReviewDocument(identity, review.edits, marks, review.lineRoutes));

  }

  function undo() {

    const previous = history.at(-1); if (!previous) return;

    setHistory(items => items.slice(0, -1)); setReview(previous); save(previous);

  }

  function resetPositions() { commit({ ...createLayoutReviewDocument(identity, initialReview.edits, review.markedForDeletion), labelPositions: initialReview.labelPositions ?? {}, rotations: initialReview.rotations ?? {}, independentAssetPositions: initialReview.independentAssetPositions ?? [], busTakeoffs: initialReview.busTakeoffs ?? {}, compactFrames: initialReview.compactFrames ?? false }); }

  function download() {

    const url = URL.createObjectURL(new Blob([JSON.stringify(review, null, 2) + '\n'], { type: 'application/json' }));

    const link = document.createElement('a'); link.href = url; link.download = `hv-layout-review-${identity.layoutRevision}.json`; link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

  }

  function previewLines(lineRoutes: LineRoutes) { setReview(current => ({ ...current, lineRoutes })); }

  function commitLines(lineRoutes: LineRoutes, before: LayoutReviewDocument) {

    const manual=new Set(before.manualLineRoutes);
    for(const [id,route]of Object.entries(lineRoutes))if(JSON.stringify(route)!==JSON.stringify(before.lineRoutes?.[id]))manual.add(id);
    commit({...createLayoutReviewDocument(identity, before.edits, before.markedForDeletion, lineRoutes),manualLineRoutes:[...manual].filter(id=>Object.hasOwn(lineRoutes,id))}, before);

  }

  function rename(id: string, name: string) {

    const names = { ...review.names }; const clean = name.trim();

    if (clean) names[id] = clean.slice(0, 160); else delete names[id];

    commit({ ...review, names });

  }

  function rotateAsset(id:string,delta:number){const rotations={...review.rotations};const angle=((rotations[id]??0)+delta+360)%360;if(angle)rotations[id]=angle;else delete rotations[id];commit({...review,rotations});}
  function previewLabels(labelPositions:NonNullable<LayoutReviewDocument['labelPositions']>){setReview(current=>({...current,labelPositions}));}
  function commitLabels(labelPositions:NonNullable<LayoutReviewDocument['labelPositions']>,before:LayoutReviewDocument){commit({...before,labelPositions},before);}
  function hideLabel(id:string){commit({...review,hiddenLabels:[...new Set([...(review.hiddenLabels??[]),id])]});}
  function restoreLabels(){commit({...review,hiddenLabels:[]});}
  function resetLabel(id:string){const labelPositions={...review.labelPositions};delete labelPositions[id];commit({...review,labelPositions});}
  function setAppearance(appearance: DiagramAppearance) { commit({ ...review, appearance: validateDiagramAppearance(appearance) }); }

  function commitBusEarths(edits: LayoutEdits, busTakeoffs: BusTakeoffs, lineRoutes: LineRoutes) {

    commit({ ...createLayoutReviewDocument(identity, edits, review.markedForDeletion, lineRoutes), busTakeoffs: validateBusTakeoffs(busTakeoffs) });

  }

  function align(edits: LayoutEdits, lineRoutes: LineRoutes, options: Pick<LayoutReviewDocument,'rotations'|'independentAssetPositions'> = {}) { commit({ ...review, edits, lineRoutes, ...options }); }
  function condense(edits: LayoutEdits, lineRoutes: LineRoutes) { commit({ ...createLayoutReviewDocument(identity, edits, review.markedForDeletion, lineRoutes), compactFrames: true }); }

  return { review, rotateAsset, rename, preview, commitEdits, previewLines, commitLines, previewLabels, commitLabels, resetLabel, hideLabel, restoreLabels, setAppearance, commitBusEarths, align, condense, toggleMark, markSelection, undo, resetPositions, download, canUndo: history.length > 0, saveStatus };

}








