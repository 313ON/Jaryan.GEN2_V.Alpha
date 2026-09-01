import type { BasisGroup } from '@jaryan/shared-knowledge';

export interface FieldCollectionItem {
  readonly groupTitle: string;
  readonly label: string;
  readonly basisStatus: 'required field measurement';
}

export function buildFieldCollectionWorklist(
  basis: readonly BasisGroup[],
): readonly FieldCollectionItem[] {
  return Object.freeze(
    basis.flatMap((group) =>
      group.items
        .filter((item) => item.status === 'required field measurement')
        .map((item) =>
          Object.freeze({
            groupTitle: group.title,
            label: item.label,
            basisStatus: 'required field measurement' as const,
          }),
        ),
    ),
  );
}
