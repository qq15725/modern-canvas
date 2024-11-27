type Callback = () => void

interface QueueItem {
  cb: Callback
  once: boolean
}

interface Options {
  sort?: number
  once?: boolean
}

export class Ticker {
  protected static _queue: QueueItem[][] = []
  protected static _currentTime = 0
  protected static _elapsed = 0
  protected static _requestId?: number

  static get currentTime(): number { return this._currentTime }
  static get elapsed(): number { return this._elapsed }

  static on(cb: Callback, options: Options = {}): void {
    const { sort = 0, once = false } = options
    if (!this._queue[sort])
      this._queue[sort] = []
    this._queue[sort].push({ cb, once })
  }

  static off(cb: Callback, options: Options = {}): void {
    const { sort = 0 } = options
    const items = this._queue[sort]
    if (!items)
      return
    const newItems = []
    for (let len = items.length, i = 0; i < len; i++) {
      const item = items[i]
      if (item.cb !== cb) {
        newItems.push(item)
      }
    }
    if (newItems.length) {
      this._queue[sort] = newItems
    }
    else {
      this._queue.splice(sort, 1)
    }
  }

  static start(): void {
    if ('requestAnimationFrame' in globalThis) {
      this._currentTime = performance.now()
      this._requestId = requestAnimationFrame(time => this._update(time))
    }
  }

  static stop(): void {
    if (this._requestId) {
      cancelAnimationFrame(this._requestId)
      this._requestId = undefined
    }
  }

  protected static _update(time: number): void {
    this._elapsed = time - this._currentTime
    this._currentTime = time
    this._requestId = requestAnimationFrame(time => this._update(time))
    this._performUpdate()
  }

  protected static _performUpdate(): void {
    const queue = this._queue
    const newQueue = []
    for (let len = queue.length, i = len; i >= 0; i--) {
      const items = queue[i]
      if (!items)
        continue
      const newItems = []
      for (let len = items.length, i = 0; i < len; i++) {
        const item = items[i]
        try {
          item.cb()
        }
        catch (err) {
          console.warn(err)
        }
        if (!item.once) {
          newItems.push(item)
        }
      }
      if (newItems.length) {
        newQueue[i] = newItems
      }
    }
    this._queue = newQueue
  }
}

Ticker.start()
