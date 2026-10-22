import { singleSupply, alternateSupplies } from '../models/synthetic';
import { earthFixture } from '../models/earth-fixture';
import { interlockFixture } from '../models/interlock-fixture';
import { uncertaintyFixture } from '../models/uncertainty-fixture';
import { relationshipsFixture } from '../models/relationships-fixture';
import { sw411Model } from '../models/site/sw411';
import { crushing1Model } from '../models/site/crushing-1';
import { powerStationModel } from '../models/site/power-station';
import { crushing2HpgrModel } from '../models/site/crushing-2-hpgr';
import { screeningModel } from '../models/site/screening';
import { desandsLaboratoryModel } from '../models/site/desands-laboratory';
import { trainLoadingModel } from '../models/site/train-loading';
import { stockpileWetPlantModel } from '../models/site/stockpile-wet-plant';
import { singleSupplyLayout, alternateLayout, earthLayout } from './diagram';
import type { DiagramLayout, DiagramPresentation, DiagramView } from './diagram';
import type { NetworkModel } from '../session/model';

function overview(model: NetworkModel, layout: DiagramLayout, bounds: DiagramView['bounds']): DiagramView {
  return { id: 'overview', label: 'Network overview', assetIds: model.assets.map(asset => asset.id), layout, bounds };
}

// Views only arrange existing identities. Neither a view nor a boundary creates a connection.
export const diagramPresentations: Record<string, DiagramPresentation> = {
  'single-supply': { overviewId: 'overview', views: [
    overview(singleSupply, singleSupplyLayout, [0, 150, 830, 300]),
    { id: 'incoming', label: 'Incoming supply', assetIds: ['supply-a', 'cb-01'], bounds: [0, 180, 530, 280],
      layout: { ...singleSupplyLayout, terminals: { ...singleSupplyLayout.terminals, 'tf-hv': [470, 300] } },
      boundaries: [{ connectionId: 'breaker-transformer', remoteAssetId: 'tf-01', targetViewId: 'transformer', position: [470, 300] }] },
    { id: 'transformer', label: 'Transformer and LV bus', assetIds: ['tf-01', 'lv-bus'], bounds: [300, 180, 530, 280],
      layout: { ...singleSupplyLayout, terminals: { ...singleSupplyLayout.terminals, 'cb-out': [350, 300] } },
      boundaries: [{ connectionId: 'breaker-transformer', remoteAssetId: 'cb-01', targetViewId: 'incoming', position: [350, 300] }] },
  ] },
  'alternate-supplies': { overviewId: 'overview', views: [
    overview(alternateSupplies, alternateLayout, [0, 40, 830, 520]),
    { id: 'substation-a', label: 'Synthetic substation A', assetIds: ['supply-a', 'cb-01', 'bus-a', 'tf-01', 'lv-bus'], bounds: [0, 40, 830, 330],
      layout: { ...alternateLayout, terminals: { ...alternateLayout.terminals, 'tie-a': [420, 300], 'loop-b': [660, 300] }, bends: { 'loop-bus-a': [[660, 250], [480, 250], [480, 140]] } },
      boundaries: [{ connectionId: 'bus-a-tie', remoteAssetId: 'tie-01', targetViewId: 'substation-b', position: [420, 300] }, { connectionId: 'loop-bus-a', remoteAssetId: 'loop-01', targetViewId: 'substation-b', position: [660, 300] }] },
    { id: 'substation-b', label: 'Synthetic substation B', assetIds: ['supply-b', 'cb-02', 'bus-b', 'tie-01', 'loop-01'], bounds: [0, 160, 830, 390],
      layout: { ...alternateLayout, terminals: { ...alternateLayout.terminals, 'hv-a': [600, 210] }, bends: { 'bus-a-tie': [[420, 210]], 'loop-bus-a': [[700, 440], [700, 210]] } },
      boundaries: [{ connectionId: 'bus-a-tie', remoteAssetId: 'bus-a', targetViewId: 'substation-a', position: [600, 210] }, { connectionId: 'loop-bus-a', remoteAssetId: 'bus-a', targetViewId: 'substation-a', position: [600, 210] }] },
  ] },
  'synthetic-earth': { overviewId: 'overview', views: [
    overview(earthFixture, earthLayout, [0, 40, 830, 520]),
    { id: 'main-section', label: 'Main transformer section', assetIds: ['supply-a', 'cb-01', 'tf-01', 'lv-bus', 'es-01'], layout: earthLayout, bounds: [0, 40, 830, 370] },
    { id: 'separate-section', label: 'Separate LV section', assetIds: ['isolated-bus', 'es-02'], layout: earthLayout, bounds: [300, 330, 530, 230] },
  ] },
};

diagramPresentations[interlockFixture.id] = diagramPresentations[earthFixture.id];
const uncertaintyLayout: DiagramLayout = {
  ...earthLayout,
  assets: { ...earthLayout.assets, 'candidate-bus': [700, 300], 'unknown-supply': [80, 480] },
  terminals: { ...earthLayout.terminals, 'candidate-lv': [700, 300], 'unknown-source-out': [110, 480] },
  bends: { ...earthLayout.bends, 'candidate-feed': [[650, 140], [650, 300]], 'unknown-source-feed': [[150, 480], [150, 550], [800, 550], [800, 440]] },
};
diagramPresentations[uncertaintyFixture.id] = { overviewId: 'overview', views: [overview(uncertaintyFixture, uncertaintyLayout, [0, 40, 830, 560])] };

const relationshipsLayout: DiagramLayout = {
  assets: { 'supply-a': [70, 200], 'cb-01': [280, 200], 'tf-01': [510, 200], 'lv-bus-a': [740, 160], 'lv-bus-b': [740, 360], 'supply-b': [300, 470] },
  terminals: { 'source-a-out': [100, 200], 'ds-in': [245, 200], 'ds-out': [315, 200], 'ds-earth': [280, 240], 'tf-hv': [475, 200], 'tf-lv-a': [545, 180], 'tf-lv-b': [545, 230], 'lv-a': [740, 160], 'lv-b': [740, 360], 'source-b-out': [330, 470] },
  bends: { 'winding-a-bus': [[620, 180], [620, 160]], 'winding-b-bus': [[620, 230], [620, 360]], 'lv-backfeed': [[680, 470], [680, 160]] },
  labelOffsets: { 'lv-bus-b': [-60, 65] },
};
diagramPresentations[relationshipsFixture.id] = { overviewId: 'overview', views: [overview(relationshipsFixture, relationshipsLayout, [0, 70, 900, 520])] };

// Adding diagram organisation creates a distinct immutable package version.
export const demonstrations: NetworkModel[] = [singleSupply, alternateSupplies, earthFixture, interlockFixture, uncertaintyFixture, relationshipsFixture].map(model => ({ ...model, version: `${model.version}-presentation.1`, presentation: diagramPresentations[model.id] }));

export const models: NetworkModel[] = [...demonstrations, sw411Model, powerStationModel, crushing1Model, crushing2HpgrModel, screeningModel, desandsLaboratoryModel, stockpileWetPlantModel, trainLoadingModel];
