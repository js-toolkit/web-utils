export interface DataLayer<D extends AnyObject> {
  push(data: D): unknown;
}
