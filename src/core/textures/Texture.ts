import type { WebGLRenderer, WebGLTextureFilterMode, WebGLTextureOptions, WebGLTextureWrapMode } from '../../renderer'
import { isPow2, SUPPORTS_IMAGE_BITMAP } from '../../shared'
import { protectedProperty } from '../decorators'
import { Resource } from '../Resource'

export type TextureFilterMode = WebGLTextureFilterMode
export type TextureWrapMode = WebGLTextureWrapMode
export interface TexturePixelsSource {
  width: number
  height: number
  pixels: Uint8Array | null
}
export type TextureSource = TexImageSource | TexturePixelsSource

export class Texture<T extends TextureSource = TextureSource> extends Resource {
  static get EMPTY(): Texture { return new this({ width: 1, height: 1, pixels: null }) }
  static get WHITE(): Texture { return new this({ width: 1, height: 1, pixels: new Uint8Array([255, 255, 255, 255]) }) }
  static get BLACK(): Texture { return new this({ width: 1, height: 1, pixels: new Uint8Array([0, 0, 0, 255]) }) }
  static get RED(): Texture { return new this({ width: 1, height: 1, pixels: new Uint8Array([255, 0, 0, 255]) }) }
  static get GREEN(): Texture { return new this({ width: 1, height: 1, pixels: new Uint8Array([0, 255, 0, 255]) }) }
  static get BLUE(): Texture { return new this({ width: 1, height: 1, pixels: new Uint8Array([0, 0, 255, 255]) }) }

  @protectedProperty() declare source: T
  @protectedProperty({ default: 0 }) declare width: number
  @protectedProperty({ default: 0 }) declare height: number
  @protectedProperty({ default: 'linear' }) declare filterMode: TextureFilterMode
  @protectedProperty({ default: 'clamp_to_edge' }) declare wrapMode: TextureWrapMode
  @protectedProperty({ default: 1 }) declare pixelRatio: number

  protected _isPowerOfTwo = false
  protected _needsUpload = false

  get valid(): boolean { return Boolean(this.width && this.height) }
  get realWidth(): number { return Math.round(this.width * this.pixelRatio) }
  get realHeight(): number { return Math.round(this.height * this.pixelRatio) }

  constructor(source: T) {
    super()
    this.source = source
    this._updateSize()
  }

  protected _refreshPOT(): void {
    this._isPowerOfTwo = isPow2(this.realWidth) && isPow2(this.realHeight)
  }

  /** @internal */
  _glTextureOptions(renderer: WebGLRenderer, options?: Partial<WebGLTextureOptions>): WebGLTextureOptions {
    let value = this.source

    if ('pixels' in value) {
      value = {
        pixels: value.pixels,
        width: this.realWidth,
        height: this.realHeight,
      } as any
    }

    let wrapMode = this.wrapMode

    if (renderer.version === 1 && !this._isPowerOfTwo) {
      wrapMode = 'clamp_to_edge'
    }

    return {
      value,
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
      return renderer.texture.create(this._glTextureOptions(renderer, options))
    })
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'width':
      case 'height':
      case 'filterMode':
      case 'wrapMode':
      case 'pixelRatio':
      case 'source':
        this.requestUpload()
        break
    }
  }

  protected _updateSize(): void {
    const source = this.source as any
    if ('pixels' in source) {
      this.width = Math.max(this.width, source.width)
      this.height = Math.max(this.height, source.height)
    }
    else {
      this.width = Number(source.naturalWidth || source.videoWidth || source.width || 0)
      this.height = Number(source.naturalHeight || source.videoHeight || source.height || 0)
    }
  }

  requestUpload(): void {
    this._needsUpload = true
    this._updateSize()
    this._refreshPOT()
  }

  upload(renderer: WebGLRenderer, options?: Partial<WebGLTextureOptions>): boolean {
    if (this._needsUpload) {
      this._needsUpload = false
      renderer.texture.update(
        this._glTexture(renderer, options),
        this._glTextureOptions(renderer, options),
      )
      return true
    }
    return false
  }

  activate(
    renderer: WebGLRenderer,
    location = 0,
  ): void {
    renderer.texture.bind({
      target: 'texture_2d',
      value: this._glTexture(renderer, { location }),
      location,
    })

    this.upload(renderer, { location })
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
