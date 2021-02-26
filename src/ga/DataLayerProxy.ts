import getHandler, { GAEventData, GADataHandler, GAEventDataTransformerMap } from './getHandler';

export { GAEventData };

export default class DataLayerProxy<D extends GAEventData> {
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
