import { MiniMapEmitter } from "../utils/MiniEmitter";

export default class BaseManager<T = any> extends MiniMapEmitter<T> {
  constructor() {
    super();
  }
  public find(callback: Parameters<T[]["find"]>[0]) {
    return [...this.values()].find(callback);
  }
  public map(callback: Parameters<T[]["map"]>[0]) {
    return [...this.values()].map(callback);
  }
}
