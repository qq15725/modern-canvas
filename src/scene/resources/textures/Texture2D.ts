import type {
  WebGLRenderer,
  WebGLTextureFilterMode,
  WebGLTextureOptions,
  WebGLTextureWrapMode,
} from '../../../core'
import { property } from 'modern-idoc'
import { isPow2, Resource, SUPPORTS_IMAGE_BITMAP } from '../../../core'

export type Texture2DFilterMode = WebGLTextureFilterMode
export type Texture2DWrapMode = WebGLTextureWrapMode
export interface Texture2DPixelsSource {
  width: number
  height: number
  pixels: Uint8Array | null
}
export type Texture2DSource = TexImageSource | Texture2DPixelsSource

export class Texture2D<T extends Texture2DSource = Texture2DSource> extends Resource {
  static get EMPTY(): Texture2D { return new this({ width: 1, height: 1, pixels: null }) }
  static get WHITE(): Texture2D { return new this({ width: 1, height: 1, pixels: new Uint8Array([255, 255, 255, 255]) }) }
  static get BLACK(): Texture2D { return new this({ width: 1, height: 1, pixels: new Uint8Array([0, 0, 0, 255]) }) }
  static get RED(): Texture2D { return new this({ width: 1, height: 1, pixels: new Uint8Array([255, 0, 0, 255]) }) }
  static get GREEN(): Texture2D { return new this({ width: 1, height: 1, pixels: new Uint8Array([0, 255, 0, 255]) }) }
  static get BLUE(): Texture2D { return new this({ width: 1, height: 1, pixels: new Uint8Array([0, 0, 255, 255]) }) }

  @property({ internal: true }) declare source: T
  @property({ fallback: 0 }) declare width: number
  @property({ fallback: 0 }) declare height: number
  @property({ fallback: 'linear' }) declare filterMode: Texture2DFilterMode
  @property({ fallback: 'clamp_to_edge' }) declare wrapMode: Texture2DWrapMode
  @property({ fallback: 1 }) declare pixelRatio: number

  protected _isPowerOfTwo = false
  protected _needsUpload = false

  get realWidth(): number { return Math.round(this.width * this.pixelRatio) }
  get realHeight(): number { return Math.round(this.height * this.pixelRatio) }

  constructor(source: T) {
    super()
    this.source = source
    this.updateSize()
  }

  isValid(): boolean {
    return Boolean(this.width && this.height)
  }

  /** @internal */
  _glTextureOptions(renderer: WebGLRenderer, options?: Partial<WebGLTextureOptions>): WebGLTextureOptions {
    let wrapMode = this.wrapMode
    if (renderer.version === 1 && !this._isPowerOfTwo) {
      wrapMode = 'clamp_to_edge'
    }
    return {
      value: this.source,
      target: 'texture_2d' as const,
      location: 0,
      filterMode: this.filterMode,
      wrapMode,
      ...options,
    }
  }

  /** @internal */
  _glTexture(renderer: WebGLRenderer, options?: Partial<WebGLTextureOptions>): WebGLTexture {
    return renderer.getRelated(this, () => {
      return renderer.texture.create(
        this._glTextureOptions(renderer, options),
      )
    })
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'width':
      case 'height':
        this._updatePOT()
        break
      case 'source':
        this.updateSize()
        break
      case 'filterMode':
      case 'wrapMode':
      case 'pixelRatio':
        this.requestUpload()
        break
    }
  }

  protected _updatePOT(): void {
    this._isPowerOfTwo = isPow2(this.realWidth) && isPow2(this.realHeight)
    this.requestUpload()
  }

  updateSize(): void {
    const source = this.source as any
    if ('pixels' in source) {
      this.width = source.width / this.pixelRatio
      this.height = source.height / this.pixelRatio
    }
    else {
      this.width = Math.round((source.naturalWidth || source.videoWidth || source.width || 0) / this.pixelRatio)
      this.height = Math.round((source.naturalHeight || source.videoHeight || source.height || 0) / this.pixelRatio)
    }
    this.requestUpload()
  }

  requestUpload(): void {
    this._needsUpload = true
  }

  upload(renderer: WebGLRenderer, options?: Partial<WebGLTextureOptions>): boolean {
    if (this._needsUpload && this.isValid()) {
      this._needsUpload = false
      renderer.texture.update(
        this._glTexture(renderer, options),
        this._glTextureOptions(renderer, options),
      )
      return true
    }
    return false
  }

  activate(renderer: WebGLRenderer, location = 0): boolean {
    if (this.isValid()) {
      renderer.texture.bind({
        target: 'texture_2d',
        value: this._glTexture(renderer, { location }),
        location,
      })

      this.upload(renderer, { location })
      return true
    }
    return false
  }

  inactivate(renderer: WebGLRenderer): void {
    renderer.texture.unbind(this._glTexture(renderer))
  }

  destroy(): void {
    if (SUPPORTS_IMAGE_BITMAP && this.source instanceof ImageBitmap) {
      this.source.close()
    }
  }
}
