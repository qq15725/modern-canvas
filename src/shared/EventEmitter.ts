type Listener = (...args: any[]) => void
type Options = boolean | AddEventListenerOptions

interface EventListener {
  value: Listener
  options?: Options
}

export class EventEmitter {
  protected _eventListeners = new Map<string, EventListener | EventListener[]>()

  addEventListener(event: string, listener: Listener, options?: Options): this {
    const object = { value: listener, options }
    const listeners = this._eventListeners.get(event)
    if (!listeners) {
      this._eventListeners.set(event, object)
    }
    else if (Array.isArray(listeners)) {
      listeners.push(object)
    }
    else {
      this._eventListeners.set(event, [listeners, object])
    }
    return this
  }

  removeEventListener(event: string, listener?: Listener, options?: Options): this {
    if (!listener) {
      this._eventListeners.delete(event)
      return this
    }

    const listeners = this._eventListeners.get(event)

    if (!listeners) {
      return this
    }

    if (Array.isArray(listeners)) {
      const events = []
      for (let i = 0, length = listeners.length; i < length; i++) {
        const object = listeners[i]
        if (
          object.value !== listener
          || (
            typeof options === 'object' && options?.once
            && (typeof object.options === 'boolean' || !object.options?.once)
          )
        ) {
          events.push(object)
        }
      }
      if (events.length) {
        this._eventListeners.set(event, events.length === 1 ? events[0] : events)
      }
      else {
        this._eventListeners.delete(event)
      }
    }
    else {
      if (
        listeners.value === listener
        && (
          (typeof options === 'boolean' || !options?.once)
          || (typeof listeners.options === 'boolean' || listeners.options?.once)
        )
      ) {
        this._eventListeners.delete(event)
      }
    }
    return this
  }

  removeAllListeners(): this {
    this._eventListeners.clear()
    return this
  }

  hasEventListener(event: string): boolean {
    return this._eventListeners.has(event)
  }

  dispatchEvent(event: string, ...args: any[]): boolean {
    const listeners = this._eventListeners.get(event)

    if (listeners) {
      if (Array.isArray(listeners)) {
        for (let len = listeners.length, i = 0; i < len; i++) {
          const object = listeners[i]
          if (typeof object.options === 'object' && object.options?.once) {
            this.off(event, object.value, object.options)
          }
          object.value.apply(this, args)
        }
      }
      else {
        if (typeof listeners.options === 'object' && listeners.options?.once) {
          this.off(event, listeners.value, listeners.options)
        }
        listeners.value.apply(this, args)
      }
      return true
    }
    else {
      return false
    }
  }

  on(event: string, listener: Listener, options?: Options): this {
    return this.addEventListener(event, listener, options)
  }

  once(event: string, listener: Listener): this {
    return this.addEventListener(event, listener, { once: true })
  }

  off(event: string, listener: Listener, options?: Options): this {
    return this.removeEventListener(event, listener, options)
  }

  emit(event: string, ...args: any[]): void {
    this.dispatchEvent(event, ...args)
  }
}
