import assert from 'node:assert/strict';
import test from 'node:test';
import {
  geometrySemanticMetadata,
  engineeringArtifactIdentity,
  physicalAssetSemanticIdentity,
  semanticBackboneRelationship,
  validateGeometrySemanticMetadata,
  validatePhysicalAssetSemanticIdentity,
  validateSemanticBackboneRelationship,
} from '@jaryan/shared-domain';

const artifact = (type, slug, sequence = 1) =>
  engineeringArtifactIdentity({
    type,
    systemCode: 'DT',
    slug,
    sequence,
    name: `${slug} artifact`,
    version: '1',
  });

const asset = (kind = 'EQUIPMENT') =>
  physicalAssetSemanticIdentity({
    canonicalIdentity: artifact('SOURCE', `ASSET-${kind}`),
    kind,
    lifecycleState: 'UNKNOWN',
    temporalValidity: { recordedAt: '2026-08-21T10:00:00Z' },
    uncertainty: 'UNKNOWN',
    relatedArtifactIdentities: [artifact('RESULT', 'ASSET-RESULT')],
  });

test('physical asset identity participates in the existing identity authority', () => {
  const identity = asset('BUILDING');

  assert.equal(identity.identityAuthority, 'EngineeringArtifactIdentity');
  assert.equal(identity.canonicalIdentity.type, 'SOURCE');
  assert.equal(identity.kind, 'BUILDING');
  assert.equal(identity.lifecycleState, 'UNKNOWN');
  assert.deepEqual(validatePhysicalAssetSemanticIdentity(identity), []);
  assert.equal(Object.isFrozen(identity), true);
  assert.equal(Object.isFrozen(identity.temporalValidity), true);
  assert.throws(() => {
    identity.relatedArtifactIdentities.push(artifact('RESULT', 'MUTATION'));
  }, TypeError);
});

test('asset validation keeps invalid lifecycle, identity, and temporal states explicit', () => {
  const errors = validatePhysicalAssetSemanticIdentity({
    canonicalIdentity: artifact('SOURCE', 'VALID'),
    kind: 'NOT_AN_ASSET',
    lifecycleState: 'OPERATIONAL',
    temporalValidity: {
      validFrom: '2026-08-22T00:00:00Z',
      validTo: '2026-08-21T00:00:00Z',
      recordedAt: 'not-a-time',
    },
    uncertainty: 'UNKNOWN',
    relatedArtifactIdentities: [],
  });

  assert.ok(errors.some((error) => error.includes('physical asset kind')));
  assert.ok(errors.some((error) => error.includes('lifecycle state')));
  assert.ok(errors.some((error) => error.includes('recordedAt')));
  assert.ok(errors.some((error) => error.includes('validFrom must not')));
});

test('relationships declare KnowledgeGraph authority and preserve evidence references', () => {
  const relationship = semanticBackboneRelationship({
    type: 'calculated-for',
    from: { kind: 'engineering-artifact', identity: artifact('RESULT', 'CALC-RESULT') },
    to: { kind: 'physical-asset', identity: asset() },
    temporalValidity: { recordedAt: '2026-08-21T11:00:00Z' },
    resolution: 'UNKNOWN',
    evidenceReference: artifact('SOURCE', 'CALC-EVIDENCE'),
  });

  assert.equal(relationship.graphAuthority, 'KnowledgeGraph');
  assert.equal(relationship.type, 'calculated-for');
  assert.equal(relationship.resolution, 'UNKNOWN');
  assert.equal(relationship.evidenceReference.type, 'SOURCE');
  assert.deepEqual(validateSemanticBackboneRelationship(relationship), []);
  assert.equal(Object.isFrozen(relationship), true);
});

test('relationship validation rejects unsupported graph authority and relationship types', () => {
  const errors = validateSemanticBackboneRelationship({
    graphAuthority: 'AssetGraph',
    type: 'documents',
    from: { kind: 'engineering-artifact', identity: artifact('RESULT', 'A') },
    to: { kind: 'engineering-artifact', identity: artifact('RESULT', 'B') },
    temporalValidity: { recordedAt: '2026-08-21T11:00:00Z' },
    resolution: 'RESOLVED',
    evidenceReference: null,
  });

  assert.ok(errors.some((error) => error.includes('KnowledgeGraph')));
  assert.ok(errors.some((error) => error.includes('relationship type')));
});

test('geometry metadata remains semantic and evidence-linked without geometry payload', () => {
  const metadata = geometrySemanticMetadata({
    representationType: 'IMPORTED',
    state: 'UNKNOWN',
    coordinateReference: null,
    units: 'm',
    productionMethod: 'external-model-import',
    uncertainty: 'UNCERTAIN',
    temporalValidity: { recordedAt: '2026-08-21T12:00:00Z' },
    evidenceReference: artifact('SOURCE', 'IMPORTED-GEOMETRY'),
  });

  assert.equal(metadata.representationType, 'IMPORTED');
  assert.equal(metadata.state, 'UNKNOWN');
  assert.equal(metadata.productionMethod, 'external-model-import');
  assert.equal(metadata.evidenceReference.type, 'SOURCE');
  assert.deepEqual(validateGeometrySemanticMetadata(metadata), []);
  assert.equal('geometry' in metadata, false);
});

test('geometry production method remains explicit and rejects empty values', () => {
  const errors = validateGeometrySemanticMetadata({
    representationType: 'DESIGN',
    state: 'DESIGNED',
    coordinateReference: null,
    units: null,
    productionMethod: '   ',
    uncertainty: 'UNKNOWN',
    temporalValidity: { recordedAt: '2026-08-21T12:00:00Z' },
    evidenceReference: null,
  });

  assert.ok(errors.some((error) => error.includes('Production method')));
});
