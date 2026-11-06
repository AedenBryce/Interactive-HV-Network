import type { Asset } from '../session/model';

/** Named dual-primary terminals are retained independently in the model.
 * They are input windings, not additional secondary windings. */
export function transformerWindings(asset: Asset) {
  const dual = [`${asset.id}:primary33`, `${asset.id}:primary22`];
  const primaries = dual.every(terminal => asset.terminals.includes(terminal)) ? dual : asset.terminals.slice(0, 1);
  return { primaries, secondaries: asset.terminals.filter(terminal => !primaries.includes(terminal)) };
}
