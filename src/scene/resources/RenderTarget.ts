import type {
  GlRenderer,
  RectangleLike,
  RenderTargetLikeReactiveObject,
  ResourceEvents,
} from '../../core'
import { property } from 'modern-idoc'
import {
  customNode,
  Resource,
} from '../../core'
import { Texture2D } from '../resources'

export interface RenderTargetEvents extends ResourceEvents {
  //
}

export interface RenderTarget {
  on: <K extends keyof RenderTargetEvents & string>(event: K, listener: (...args: RenderTargetEvents[K]) => void) => this
  once: <K extends keyof RenderTargetEvents & string>(event: K, listener: (...args: RenderTargetEvents[K]) => void) => this
  off: <K extends keyof RenderTargetEvents & string>(event: K, listener: (...args: RenderTargetEvents[K]) => void) => this
  emit: <K extends keyof RenderTargetEvents & string>(event: K, ...args: RenderTargetEvents[K]) => this
}

@customNode('RenderTarget')
export class RenderTarget extends Resource implements RenderTargetLikeReactiveObject {
  @property({ fallback: false }) declare isRoot: boolean
  @property({ fallback: 0 }) declare x: number
  @property({ fallback: 0 }) declare y: number
  @property({ fallback: 0 }) declare width: number
  @property({ fallback: 0 }) declare height: number
  @property({ fallback: 0 }) declare mipLevel: number
  @property({ fallback: false }) declare msaa: boolean
  @property({ default: () => [new Texture2D()] }) declare colorTextures: Texture2D<null>[]

  get valid(): boolean { return Boolean(this.width && this.height) }
  get colorTexture(): Texture2D<null> { return this.colorTextures[0] }

  protected _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'width':
      case 'height':
        this.colorTextures.forEach((texture) => {
          texture.width = this.width
          texture.height = this.height
        })
        break
    }
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  activate(renderer: GlRenderer, frame?: RectangleLike): boolean {
    if (this.valid) {
      renderer.renderTarget.bind(this, frame)
      return true
    }
    return false
  }
}
