import type { DataLayer } from '../types';
import {
  getHandler,
  type GADataHandler,
  type GAEventData,
  type GAEventDataTransformerMap,
} from './getHandler';

export class DataLayerProxy<D extends GAEventData> implements DataLayer<D> {
  private readonly handler: GADataHandler<D>;

  constructor(transformers: GAEventDataTransformerMap<D>) {
    const handler = getHandler('auto', transformers);
    this.handler = handler;
  }

  push(data: D): void {
    this.handler(data);
  }
}
