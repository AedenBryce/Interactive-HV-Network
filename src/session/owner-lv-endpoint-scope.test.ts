import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { continuationNetworkModel } from '../models/site/current-network';
import { withOwnerLvEndpointScope } from '../models/site/owner-lv-endpoint-scope';

describe('owner91/92 LV endpoint scope through SimulationSession', () => {
  it('names MC451B as a continuous bus section and selects the six AC endpoints without converter expansion', () => {
    const session = new SimulationSession(withOwnerLvEndpointScope(continuationNetworkModel, 'test-lv-scope9'));
    const { model } = session.saveScenario();
    expect(model.assets.find(asset => asset.id === 'sw451:mc451b:section')).toMatchObject({ kind: 'bus', label: 'MC451B · continuous MC451 bus section' });
    for (const endpointId of ['rm406:vs4061:input-a:boundary', 'rm406:vs4061:input-b:boundary', 'rm410:vs4101:input-a:boundary', 'rm410:vs4101:input-b:boundary', 'rm413a:ac-input-a:boundary', 'rm413a:ac-input-b:boundary']) {
      expect(model.assets.find(asset => asset.id === endpointId)?.label).toContain('V1 AC endpoint');
      expect(model.assets.find(asset => asset.id === endpointId)?.knowledge).toBe('provisional');
    }
    expect(model.assets).toHaveLength(continuationNetworkModel.assets.length);
    expect(model.starting).toEqual(continuationNetworkModel.starting);
    expect(model.interlocks).toEqual(continuationNetworkModel.interlocks);
    expect(model.earths).toEqual(continuationNetworkModel.earths);
    expect(model.reviews!.find(record => record.id === 'TL-R04')?.status).toBe('open');
    expect(model.assets.flatMap(asset => asset.sourceArcs ?? [])).toEqual(continuationNetworkModel.assets.flatMap(asset => asset.sourceArcs ?? []));
  });
});
