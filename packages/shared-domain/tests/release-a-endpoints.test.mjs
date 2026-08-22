import assert from 'node:assert/strict';
import test from 'node:test';
import {
  engineeringArtifactIdentity,
  engineeringObjectSemanticReference,
  geometryReference,
  knowledgeGraphEndpoint,
  locationReference,
  physicalReferentIdentity,
  validateGeometryReference,
  validateKnowledgeGraphEndpointReference,
} from '@jaryan/shared-domain';

const artifact = engineeringArtifactIdentity({
  type: 'RESULT',
  systemCode: 'REL',
  slug: 'ENDPOINT',
  sequence: 1,
  name: 'Release A endpoint',
  version: '1',
});
const physical = physicalReferentIdentity({
  referentKey: 'governed:PLANT-A:PUMP-001',
});
const artifactReference = {
  kind: 'ARTIFACT',
  status: 'RESOLVED',
  identity: artifact,
};
const physicalReference = {
  kind: 'PHYSICAL_REFERENT',
  status: 'RESOLVED',
  identity: physical,
};

test('geometry references are opaque, immutable, and explicitly resolved without geometry identity', () => {
  const reference = geometryReference({
    referenceKey: 'imported:geometry:pump-001',
    resolution: 'RESOLVED',
  });

  assert.equal(reference.referenceKey, 'imported:geometry:pump-001');
  assert.equal(reference.resolution, 'RESOLVED');
  assert.equal(Object.isFrozen(reference), true);
  assert.equal('identity' in reference, false);
  assert.equal('geometry' in reference, false);
});

test('geometry unknown, unresolved, ambiguous, and invalid states remain explicit', () => {
  assert.deepEqual(
    geometryReference({ resolution: 'UNKNOWN' }),
    { referenceKey: null, resolution: 'UNKNOWN' },
  );
  assert.equal(
    geometryReference({
      referenceKey: 'external:geometry:1',
      resolution: 'UNRESOLVED',
    }).resolution,
    'UNRESOLVED',
  );
  assert.equal(
    geometryReference({
      referenceKey: 'external:geometry:many',
      resolution: 'AMBIGUOUS',
    }).resolution,
    'AMBIGUOUS',
  );
  assert.ok(validateGeometryReference({ resolution: 'INVALID' }).length === 0);
  assert.throws(
    () => geometryReference({ resolution: 'UNRESOLVED' }),
    /require an opaque reference key/i,
  );
});

test('geometry references do not become graph identities or predicates', () => {
  const reference = geometryReference({
    referenceKey: 'geometry:pump-001',
    resolution: 'RESOLVED',
  });
  assert.equal('identity' in reference, false);
  assert.equal('predicate' in reference, false);
});

test('KnowledgeGraph endpoint validation accepts governed artifact and physical identities', () => {
  const artifactEndpoint = knowledgeGraphEndpoint(artifactReference);
  const physicalEndpoint = knowledgeGraphEndpoint(physicalReference);

  assert.equal(artifactEndpoint.kind, 'ARTIFACT');
  assert.equal(physicalEndpoint.kind, 'PHYSICAL_REFERENT');
  assert.deepEqual(validateKnowledgeGraphEndpointReference(artifactReference), []);
  assert.deepEqual(validateKnowledgeGraphEndpointReference(physicalReference), []);
});

test('unresolved, ambiguous, and invalid references cannot become graph endpoints', () => {
  for (const status of ['UNKNOWN', 'UNRESOLVED', 'AMBIGUOUS', 'INVALID']) {
    const reference = engineeringObjectSemanticReference({
      kind: 'PHYSICAL_REFERENT',
      status,
    });
    assert.ok(validateKnowledgeGraphEndpointReference(reference).length > 0);
    assert.throws(() => knowledgeGraphEndpoint(reference), /must be RESOLVED/i);
  }
});

test('unsupported semantic references cannot become graph endpoints', () => {
  const location = locationReference({
    status: 'UNRESOLVED',
    referenceKey: 'site:west',
  });
  const geometry = geometryReference({
    status: undefined,
    resolution: 'UNRESOLVED',
    referenceKey: 'geometry:1',
  });

  assert.ok(validateKnowledgeGraphEndpointReference(location).length > 0);
  assert.ok(validateKnowledgeGraphEndpointReference(geometry).length > 0);
});

test('endpoint canonicalization is deterministic and does not select fallbacks', () => {
  const first = knowledgeGraphEndpoint({
    ...physicalReference,
    identity: { ...physical },
  });
  const second = knowledgeGraphEndpoint({
    kind: 'PHYSICAL_REFERENT',
    status: 'RESOLVED',
    identity: {
      canonicalIdentity: physical.canonicalIdentity,
      referentKey: physical.referentKey,
      identityKind: physical.identityKind,
      identityAuthority: physical.identityAuthority,
    },
  });

  assert.deepEqual(first, second);
});

test('location, geometry, observation, and measurement remain outside graph identity', () => {
  const location = locationReference({ status: 'UNKNOWN' });
  const geometry = geometryReference({ resolution: 'UNKNOWN' });

  assert.equal('identity' in location, false);
  assert.equal('identity' in geometry, false);
  assert.equal('predicate' in location, false);
  assert.equal('predicate' in geometry, false);
});

