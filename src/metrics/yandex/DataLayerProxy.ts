import type { DataLayer } from '../types';
import {
  getHandler,
  type YaDataHandler,
  type YAEventDataTransformerMap,
  type YaLibType,
  type YMEventData,
} from './getHandler';

export class DataLayerProxy<D extends YMEventData> implements DataLayer<D> {
  private readonly handler: YaDataHandler<D>;

  constructor(lib: YaLibType, transformers: YAEventDataTransformerMap<D>) {
    const handler = getHandler(lib, transformers);
    this.handler = handler;
  }

  push(data: D): void {
    this.handler(data);
  }
}
