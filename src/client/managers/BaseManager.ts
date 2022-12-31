import { MiniMapEmitter } from "../utils/MiniEmitter";

export default class BaseManager<T = any> extends MiniMapEmitter<T> {
  constructor() {
    super();
  }
  public items() {
    return [...this.values()];
  }
  public find(callback: Parameters<T[]["find"]>[0]) {
    return this.items().find(callback);
  }
  public map(callback: Parameters<T[]["map"]>[0]) {
    return this.items().map(callback);
  }
}
