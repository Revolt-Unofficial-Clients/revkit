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

  public find(...d: Parameters<ReturnType<typeof this.items>["find"]>) {
    return this.items().find(...d);
  }
  public filter(...d: Parameters<ReturnType<typeof this.items>["filter"]>) {
    return this.items().filter(...d);
  }
  public map(...d: Parameters<ReturnType<typeof this.items>["map"]>) {
    return this.items().map(...d);
  }
}
