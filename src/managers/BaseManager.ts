import { BaseObject } from "../objects/BaseObject";
import { MiniMapEmitter } from "../utils/MiniEmitter";

export class BaseManager<T extends BaseObject<any>> extends MiniMapEmitter<T> {
  constructor() {
    super();
  }

  public set(key: string, value: T) {
    super.set(key, value);
    this.fireUpdate();
    return this;
  }
  public delete(key: string) {
    const has = this.get(key);
    if (has) has.update({ deleted: true });
    return super.delete(key);
  }
  public items() {
    return [...this.values()];
  }

  public get find() {
    return this.items().find;
  }
  public get filter() {
    return this.items().filter;
  }
  public get map() {
    return this.items().map;
  }
}
