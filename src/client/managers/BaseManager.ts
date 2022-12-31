export default class BaseManager<T = any> extends Map<string, T> {
  constructor() {
    super();
  }
  public find(cb: Parameters<T[]["find"]>[0]) {
    return [...this.values()].find(cb);
  }
  public map(cb: Parameters<T[]["map"]>[0]) {
    return [...this.values()].map(cb);
  }
}
