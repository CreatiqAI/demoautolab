import type { ColumnMap, Entity } from '../types';
import { componentsColumnMap } from './components';
import { productsColumnMap } from './products';

const maps: Record<Entity, ColumnMap> = {
  component: componentsColumnMap,
  product: productsColumnMap,
};

export function getColumnMap(entity: Entity): ColumnMap {
  return maps[entity];
}

export { componentsColumnMap, productsColumnMap };
