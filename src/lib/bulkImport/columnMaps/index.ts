import type { ColumnMap, Entity } from '../types';
import { componentsColumnMap } from './components';

const maps: Record<Entity, ColumnMap | null> = {
  component: componentsColumnMap,
  product: null,  // added in Task 23
};

export function getColumnMap(entity: Entity): ColumnMap {
  const map = maps[entity];
  if (!map) throw new Error(`No column map registered for entity: ${entity}`);
  return map;
}

export { componentsColumnMap };
