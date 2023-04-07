export type MiniEmitterCallback<Updated> = (updated: Updated[]) => any;

// inefficient but whatever ig

export class MiniEmitter<T = any> {
  private _callbacks: MiniEmitterCallback<T>[] = [];

  constructor() {}

  /**
   * Listen for an update to this Map.
   * @param callback The callback to run when an update occurs.
   * @returns `this`, useful for chaining.
   */
  public onUpdate(callback: MiniEmitterCallback<T>) {
    this._callbacks.push(callback);
    return this;
  }
  /**
   * Stops listening for Map updates.
   * @param callback The callback to stop listening for updates on.
   * @returns `this`, useful for chaining.
   */
  public offUpdate(callback: MiniEmitterCallback<T>) {
    const i = this._callbacks.indexOf(callback);
    if (i >= 0) this._callbacks.splice(i, 1);
    return this;
  }
  /**
   * Runs all of the callbacks for this emitter. (meant to run when an update occurs)
   * @param updated The objects that caused this update.
   */
  public fireUpdate(updated?: T[]) {
    this._callbacks.forEach((c) => c(updated || []));
  }
}
export class MiniMapEmitter<T> extends Map<string, T> {
  private _callbacks: MiniEmitterCallback<T>[] = [];

  constructor() {
    super();
  }

  /**
   * Listen for an update to this Map.
   * @param callback The callback to run when an update occurs.
   * @returns `this`, useful for chaining.
   */
  public onUpdate(callback: MiniEmitterCallback<T>) {
    this._callbacks.push(callback);
    return this;
  }
  /**
   * Stops listening for Map updates.
   * @param callback The callback to stop listening for updates on.
   * @returns `this`, useful for chaining.
   */
  public offUpdate(callback: MiniEmitterCallback<T>) {
    const i = this._callbacks.indexOf(callback);
    if (i >= 0) this._callbacks.splice(i, 1);
    return this;
  }
  /**
   * Runs all of the callbacks for this emitter. (meant to run when an update occurs)
   * @param updated The objects that caused this update.
   */
  public fireUpdate(updated?: T[]) {
    this._callbacks.forEach((c) => c(updated || []));
  }
}
