export type EventListenerValue = (...args: any[]) => void
export type EventListenerOptions = boolean | AddEventListenerOptions
export interface EventListener {
  value: EventListenerValue
  options?: EventListenerOptions
}

export class EventEmitter {
  eventListeners = new Map<string, EventListener | EventListener[]>()

  removeAllListeners(): this {
    this.eventListeners.clear()
    return this
  }

  hasEventListener(event: string): boolean {
    return this.eventListeners.has(event)
  }

  on(type: string, listener: EventListenerValue, options?: EventListenerOptions): any {
    const object = { value: listener, options }
    const listeners = this.eventListeners.get(type)
    if (!listeners) {
      this.eventListeners.set(type, object)
    }
    else if (Array.isArray(listeners)) {
      listeners.push(object)
    }
    else {
      this.eventListeners.set(type, [listeners, object])
    }
    return this
  }

  once(type: string, listener: EventListenerValue): this {
    return this.on(type, listener, { once: true })
  }

  off(type: string, listener?: EventListenerValue, options?: EventListenerOptions): this {
    if (!listener) {
      this.eventListeners.delete(type)
      return this
    }

    const listeners = this.eventListeners.get(type)

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
        this.eventListeners.set(type, events.length === 1 ? events[0] : events)
      }
      else {
        this.eventListeners.delete(type)
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
        this.eventListeners.delete(type)
      }
    }
    return this
  }

  emit(type: string, ...args: any[]): boolean {
    const listeners = this.eventListeners.get(type)

    if (listeners) {
      if (Array.isArray(listeners)) {
        for (let len = listeners.length, i = 0; i < len; i++) {
          const object = listeners[i]
          if (typeof object.options === 'object' && object.options?.once) {
            this.off(type, object.value, object.options)
          }
          object.value.apply(this, args)
        }
      }
      else {
        if (typeof listeners.options === 'object' && listeners.options?.once) {
          this.off(type, listeners.value, listeners.options)
        }
        listeners.value.apply(this, args)
      }
      return true
    }
    else {
      return false
    }
  }
}
