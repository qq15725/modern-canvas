import type { Audio } from '../Audio'
import { HTMLAudioContext } from './HTMLAudioContext'
import { HTMLSound } from './HTMLSound'

export class HTMLAudio {
  source = new globalThis.Audio()

  protected _src = ''
  get src(): string { return this._src }
  set src(val) {
    if (this._src !== val) {
      this._src = val
      this.load()
    }
  }

  get duration(): number { return this.source.duration }
  get isPlayable(): boolean { return !!this.source && this.source.readyState === 4 }

  get context(): HTMLAudioContext {
    return HTMLAudioContext.instance
  }

  constructor(
    public parent: Audio,
  ) {
    //
  }

  async load(): Promise<this> {
    return new Promise((resolve) => {
      this.source.onload = () => resolve(this)
      this.source.src = this._src
      this.source.load()
    })
  }

  createSound(): HTMLSound {
    return new HTMLSound()
  }
}
