import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import inventory from '../../../drawing-review/supplemental/interlock-profile-review.json';

const id = 'WN-DEFERRED-KEY-DOOR-INCHING';
const answer = 'Explicitly defer these listed sequences for V1';
const question = '49. For V1, how should the remaining key, door and inching-isolator sequences be handled in profile groups P06–P10 and P15: hopper MV/maintenance keys, SW505 inching/drive keys, HPGR Fortress/DC-earth keys and RM420 Ronis keys? These are additional systems beyond the cross-station keys already deferred. Deferral would explicitly mark these sequences as not modeled; local contact/racking/earth restrictions would still need their own agreed profiles.';
const selected = {
  P06: ['rm420:mc420:in:es', 'rm420:mc420:in:vcb', ...['wh:h1:mc417', 'wh:h3:mc416', 'wh:h7:mc418', 'wh:h8:mc416', 'wh:h9:mc419'].flatMap(prefix => [`${prefix}:in`, `${prefix}:in-earth`])],
  P07: [
    ...['rm420:mc420:motor-01', 'rm420:mc420:motor-02'].flatMap(prefix => [`${prefix}:es`, `${prefix}:fc`, `${prefix}:rc`]),
    ...['wh:h1:mc417', 'wh:h3:mc416', 'wh:h7:mc418', 'wh:h8:mc416', 'wh:h9:mc419'].flatMap(prefix => [1, 2].flatMap(motor => [`${prefix}:m${motor}:earth`, `${prefix}:m${motor}:fc`, `${prefix}:m${motor}:rc`])),
  ],
  P08: ['a', 'b', 'c'].flatMap(suffix => [`sw505:tf505${suffix}:hv-cb`, `sw505:tf505${suffix}:hv-es`]),
  P09: ['01', '02', '03'].flatMap(suffix => [`sw505:vs505${suffix}:dc-earth`, `sw505:vs505${suffix}:output-switch`]),
  P10: ['hpgr:drive-mea:dc-earth', 'hpgr:drive-meb:dc-earth', 'hpgr:sw002:a01:q8', 'hpgr:sw002:a02:k101', 'hpgr:sw002:a02:q8', 'hpgr:sw002:a04:k101', 'hpgr:sw002:a04:q8', 'hpgr:sw002:tf004:k202', 'hpgr:sw002:tf004:q8', 'sw435:hpgr:cb', 'sw435:hpgr:es'],
  P15: ['rm420:es01', 'rm420:spare:cb', 'rm420:spare:es', 'rm420:spare:sw', 'rm420:sw01', 'rm420:tf420a:cb', 'rm420:tf420a:es', 'rm420:tf420a:sw', 'rm420:tf420b:cb', 'rm420:tf420b:es', 'rm420:tf420b:sw'],
};
const uniqueReferences = (references: EvidenceReference[]) => [...new Map(references.map(reference => [JSON.stringify(reference), reference])).values()];

/** Record bounded V1 scope only; it supplies no local-action permission. */
export function withOwnerKeySequenceDeferral(base: NetworkModel, version: string): NetworkModel {
  if (base.evidence?.some(record => record.id === id) || base.reviews?.some(record => record.id === id)) throw new Error('Key/door/inching scope deferral already applied; use the prior immutable package.');
  if (!version.trim() || version === base.version) throw new Error('Key-sequence scope changes require a new immutable model version.');
  const model = { ...structuredClone(base), version };
  if (!model.interlocks) throw new Error('Existing interlock reviews are required for bounded deferral.');
  const ids = Object.values(selected).flat();
  if (ids.length !== 82 || new Set(ids).size !== 82) throw new Error('Review required: exact 82-control key-sequence scope changed.');
  const reference = { document: 'Project owner conversation', revision: '2026-10-23', clause: `${id}; question49 verbatim: ${question} Exact answer: ${answer}. Bounded MODEL SCOPE deferral only; no local contact/racking/earth guards, transformer/source behavior or actual hardware are deferred. This record does not enable actions or establish actual switching permission.` };
  const references: EvidenceReference[] = [reference];
  for (const [groupId, assetIds] of Object.entries(selected)) {
    const group = inventory.groups.find(group => group.id === groupId);
    if (!group || group.assetIds.length !== assetIds.length || group.assetIds.some(assetId => !assetIds.includes(assetId))) throw new Error(`Review required: frozen ${groupId} key-sequence identity inventory changed.`);
    const inventoryReference = { document: 'drawing-review/supplemental/interlock-profile-review.json', revision: inventory.reviewDate, clause: `${groupId}: exact ${assetIds.length} selected identities; ${group.title}. Only listed key/door/inching-isolator sequences are deferred, not the group's unanswered local action/hardware questions.` };
    const groupReferences = group.references.map(source => ({ document: source.document, revision: source.revision, page: source.page, clause: source.region }));
    references.push(inventoryReference, ...groupReferences);
    for (const assetId of assetIds) {
      const asset = model.assets.find(asset => asset.id === assetId);
      const review = model.interlocks.reviews.find(review => review.assetId === assetId);
      const row = group.assets.find(row => row.assetId === assetId);
      if (!asset || !review || !row || asset.kind !== row.kind) throw new Error(`Review required: key-sequence scope asset/review ${assetId} changed.`);
      const historical = review.note;
      review.note = `Owner answer49 defers only this ${groupId} control's listed key/door/inching-isolator sequences for V1. This bounded MODEL SCOPE decision does not supply a local action profile or change its review status. All intrinsic and declared contact/racking/earth restrictions remain mandatory. Source transfer, actual hardware and actual switching permission remain separate. Historical construction review context (retained provenance; the key-sequence scope above is current): ${historical}`;
      review.evidence = uniqueReferences([...review.evidence, ...row.references, ...groupReferences, inventoryReference, reference]);
      references.push(...review.evidence);
    }
  }
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer };
  (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: uniqueReferences(references), summary: `Bounded MODEL SCOPE selection for exactly 82 controls in P06/P07/P08/P09/P10/P15. Question49 verbatim: ${question} Exact answer: ${answer}. Only the listed key/door/inching-isolator sequences are deferred for V1. Existing interlock statuses/rules and all state, hardware and source/earth claims are preserved. A separate complete local profile is still required before any unresolved control can become actionable. This is not a blanket network key deferral or physical switching permission.` });
  (model.reviews ??= []).push({ id, status: 'resolved', question: `Question49 verbatim: ${question} Resolution covers only the bounded V1 key/door/inching-isolator sequence scope; local profiles, actual hardware, source transfer and whole-model acceptance remain separate.`, evidenceIds: [id], resolution: confirmation });
  return model;
}
