export type MiniEmitterCallback<Updated> = (updated: Updated[]) => any;

// inefficient but whatever ig

export class MiniEmitter<T = any> {
  private _callbacks: MiniEmitterCallback<T>[] = [];

  constructor() {}

  public onUpdate(callback: MiniEmitterCallback<T>) {
    this._callbacks.push(callback);
    return this;
  }
  public offUpdate(callback: MiniEmitterCallback<T>) {
    const i = this._callbacks.indexOf(callback);
    if (i >= 0) this._callbacks.splice(i, 1);
    return this;
  }
  protected fireUpdate(updated?: T[]) {
    this._callbacks.forEach((c) => c(updated || []));
  }
}
export class MiniMapEmitter<T> extends Map<string, T> {
  private _callbacks: MiniEmitterCallback<T>[] = [];

  constructor() {
    super();
  }

  public onUpdate(callback: MiniEmitterCallback<T>) {
    this._callbacks.push(callback);
    return this;
  }
  public offUpdate(callback: MiniEmitterCallback<T>) {
    const i = this._callbacks.indexOf(callback);
    if (i >= 0) this._callbacks.splice(i, 1);
    return this;
  }
  protected fireUpdate(updated?: T[]) {
    this._callbacks.forEach((c) => c(updated || []));
  }
}
