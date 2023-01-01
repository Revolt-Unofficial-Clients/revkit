import BaseObject from "../objects/BaseObject";
import { MiniMapEmitter } from "../utils/MiniEmitter";

export default class BaseManager<T extends BaseObject<any>> extends MiniMapEmitter<T> {
  constructor() {
    super();
  }

  public delete(key: string) {
    const has = this.get(key);
    if (has) has.update({ deleted: true });
    return super.delete(key);
  }
  public items() {
    return [...this.values()];
  }

  public find(callback: Parameters<T[]["find"]>[0]) {
    return this.items().find(callback);
  }
  public filter(callback: Parameters<T[]["filter"]>[0]) {
    return this.items().filter(callback);
  }
  public map(callback: Parameters<T[]["map"]>[0]) {
    return this.items().map(callback);
  }
}
