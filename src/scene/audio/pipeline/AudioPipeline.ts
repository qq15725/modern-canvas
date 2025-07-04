import type { IAudioNode } from '../interfaces'
import type { AudioProcessor } from './AudioProcessor'
import { EventEmitter } from 'modern-idoc'

export class AudioPipeline extends EventEmitter {
  protected _processers: AudioProcessor[] = []

  constructor(
    protected _input: IAudioNode,
    protected _output: IAudioNode,
  ) {
    super()
  }

  get processors(): AudioProcessor[] { return this._processers }
  set processors(val) {
    this._processers.forEach(filter => filter.disconnect())
    this._processers.length = 0
    this._input.connect(this._output)

    if (val.length) {
      this._processers = val.slice(0)
      this._input.disconnect()
      let last: AudioProcessor
      val.forEach((processer) => {
        if (!last) {
          this._input.connect(processer.destination)
        }
        else {
          last.connect(processer.destination)
        }
        last = processer
      })
      last!.connect(this._output)
    }
  }

  get destination(): IAudioNode { return this._input }
}
