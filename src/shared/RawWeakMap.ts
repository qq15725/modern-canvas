export class RawWeakMap<K extends WeakKey = WeakKey, V = any> {
  protected _map = new WeakMap<K, V>()

  // fix: vue reactive object
  protected _toRaw(value: any): any {
    if (value && typeof value === 'object') {
      const raw = value.__v_raw
      if (raw) {
        value = this._toRaw(raw)
      }
    }
    return value
  }

  /**
   * Removes the specified element from the WeakMap.
   * @returns true if the element was successfully removed, or false if it was not present.
   */
  delete(key: K): boolean {
    return this._map.delete(this._toRaw(key))
  }

  /**
   * @returns a specified element.
   */
  get(key: K): V | undefined {
    return this._map.get(this._toRaw(key))
  }

  /**
   * @returns a boolean indicating whether an element with the specified key exists or not.
   */
  has(key: K): boolean {
    return this._map.has(this._toRaw(key))
  }

  /**
   * Adds a new element with a specified key and value.
   * @param key Must be an object or symbol.
   */
  set(key: K, value: V): this {
    this._map.set(this._toRaw(key), this._toRaw(value))
    return this
  }
}
