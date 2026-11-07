import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { earthFixture } from '../models/earth-fixture';
import { currentNetworkModel } from '../models/site/current-network';
import { SimulationSession } from '../session/session';
import { AssetActions } from './AssetActions';

function renderActions(model: typeof earthFixture | typeof currentNetworkModel, assetId: string) {
  const snapshot = new SimulationSession(model).snapshot();
  return renderToStaticMarkup(createElement(AssetActions, {
    snapshot,
    assetId,
    anchor: { x: 20, y: 30 },
    onChange: () => undefined,
    onSource: () => undefined,
    onClose: () => undefined,
  }));
}

describe('AssetActions switching-program metadata', () => {
  it('shows the assigned program location, voltage, and drawing reference', () => {
    const markup = renderActions(currentNetworkModel, 'rm413a:ac-input-a:switch');

    expect(markup).toContain('SWITCHING PROGRAM DETAILS');
    expect(markup).toContain('690V');
    expect(markup).toContain('CB17OP023A-04057-DR-EL-0004');
    expect(markup).toContain('PROGRAM LOCATION');
    expect(markup).toContain('RM413A');
    expect(markup).not.toContain('PROGRAM METADATA INCOMPLETE');
  });

  it('shows the owner-confirmed 0V earth-switch voltage without inventing a drawing reference', () => {
    const markup = renderActions(earthFixture, 'es-01');

    expect(markup).toContain('0V');
    expect(markup).toContain('DRAWING REFERENCES');
    expect(markup).toContain('NOT ASSIGNED');
    expect(markup).toContain('PROGRAM METADATA INCOMPLETE');
    expect(markup).toContain('ASSOCIATED CIRCUIT TEST VOLTAGE');
  });

  it('omits program metadata for an asset that is not switchable', () => {
    const markup = renderActions(earthFixture, 'isolated-bus');

    expect(markup).not.toContain('SWITCHING PROGRAM DETAILS');
  });
});
