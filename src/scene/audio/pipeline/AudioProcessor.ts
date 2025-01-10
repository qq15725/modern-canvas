import type { IAudioNode } from '../interfaces'

export abstract class AudioProcessor {
  constructor(
    public destination: IAudioNode,
    public source: IAudioNode | null = null,
  ) {
    //
  }

  connect(destination: IAudioNode): void {
    this.source?.connect(destination)
  }

  disconnect(): void {
    this.source?.disconnect()
  }
}
