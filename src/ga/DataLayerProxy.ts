import getHandler, {
  type GAEventData,
  type GADataHandler,
  type GAEventDataTransformerMap,
} from './getHandler';

export type { GAEventData };

export class DataLayerProxy<D extends GAEventData> {
  private readonly handler: GADataHandler<D>;

  constructor(transformers: GAEventDataTransformerMap<D>) {
    const handler = getHandler('auto', transformers);
    if (!handler) throw new Error('Data layer for Google Analytics is undefined.');
    this.handler = handler;
  }

  push(data: D): void {
    this.handler(data);
  }
}

export default DataLayerProxy;
