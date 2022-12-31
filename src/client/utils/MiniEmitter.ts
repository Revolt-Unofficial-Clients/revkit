export type MiniEmitterCallback = () => any;

// inefficient but whatever ig

export class MiniEmitter {
  private _callbacks: MiniEmitterCallback[] = [];

  constructor() {}

  public onUpdate(callback: MiniEmitterCallback) {
    this._callbacks.push(callback);
    return this;
  }
  public offUpdate(callback: MiniEmitterCallback) {
    const i = this._callbacks.indexOf(callback);
    if (i >= 0) this._callbacks.splice(i, 1);
    return this;
  }
  protected fireUpdate() {
    this._callbacks.forEach((c) => c());
  }
}
export class MiniMapEmitter<T> extends Map<string, T> {
  private _callbacks: MiniEmitterCallback[] = [];

  constructor() {
    super();
  }

  public onUpdate(callback: MiniEmitterCallback) {
    this._callbacks.push(callback);
    return this;
  }
  public offUpdate(callback: MiniEmitterCallback) {
    const i = this._callbacks.indexOf(callback);
    if (i >= 0) this._callbacks.splice(i, 1);
    return this;
  }
  protected fireUpdate() {
    this._callbacks.forEach((c) => c());
  }
}
