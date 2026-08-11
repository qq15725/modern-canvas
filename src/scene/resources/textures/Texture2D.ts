import type {
  AlphaMode,
  ScaleMode,
  TextureFormat,
  TextureLikeObject,
  TextureLikeReactiveObject,
  TextureSource,
  WebGLRenderer, WrapMode,
} from '../../../core'
import { property } from 'modern-idoc'
import { isPow2, Resource, SUPPORTS_IMAGE_BITMAP } from '../../../core'

export interface Texture2DProperties<T extends TextureSource = TextureSource> extends Partial<Omit<TextureLikeObject, 'source'>> {
  source?: T
}

export class Texture2D<T extends TextureSource = TextureSource> extends Resource implements TextureLikeReactiveObject {
  static get EMPTY(): Texture2D { return new this({ width: 1, height: 1 }) }
  static get WHITE(): Texture2D { return new this({ width: 1, height: 1, source: new Uint8Array([255, 255, 255, 255]) }) }
  static get BLACK(): Texture2D { return new this({ width: 1, height: 1, source: new Uint8Array([0, 0, 0, 255]) }) }
  static get RED(): Texture2D { return new this({ width: 1, height: 1, source: new Uint8Array([255, 0, 0, 255]) }) }
  static get GREEN(): Texture2D { return new this({ width: 1, height: 1, source: new Uint8Array([0, 255, 0, 255]) }) }
  static get BLUE(): Texture2D { return new this({ width: 1, height: 1, source: new Uint8Array([0, 0, 255, 255]) }) }

  @property({ fallback: 'unknown' }) declare uploadMethodId: string
  @property({ internal: true }) declare source: T
  @property({ fallback: 0 }) declare width: number
  @property({ fallback: 0 }) declare height: number
  @property({ fallback: 1 }) declare pixelRatio: number
  @property({ fallback: 'bgra8unorm' }) declare format: TextureFormat
  @property({ fallback: 'premultiply-alpha-on-upload' }) declare alphaMode: AlphaMode
  @property({ fallback: 1 }) declare mipLevelCount: number
  @property({ fallback: false }) declare mipmap: boolean
  @property({ fallback: 'clamp-to-edge' }) declare addressModeU: WrapMode
  @property({ fallback: 'clamp-to-edge' }) declare addressModeV: WrapMode
  @property({ fallback: 'clamp-to-edge' }) declare addressModeW: WrapMode
  @property({ fallback: 'linear' }) declare magFilter: ScaleMode
  @property({ fallback: 'linear' }) declare minFilter: ScaleMode
  @property({ fallback: 'linear' }) declare mipmapFilter: ScaleMode
  @property({ fallback: false }) declare isPowerOfTwo: boolean

  get sourceWidth(): number {
    const source = (this.source || {}) as any
    return Number(
      source.naturalWidth
      || source.videoWidth
      || source.displayWidth
      || source.width
      || 0,
    )
  }

  get sourceHeight(): number {
    const source = (this.source || {}) as any
    return Number(
      source.naturalHeight
      || source.videoHeight
      || source.displayHeight
      || source.height
      || 0,
    )
  }

  get pixelWidth(): number {
    if (this.width) {
      // WebGL 纹理尺寸只能是整数；CanvasTexture 的 backing store 同样按 ceil 建立。
      // 两边必须使用同一口径，否则小数 pixelRatio 会让 source 比 GPU 目标多 1px，
      // texSubImage2D 随即越界，表现为文字偶发空白或 GL_INVALID_VALUE。
      return Math.ceil(this.width * this.pixelRatio)
    }
    else {
      return this.sourceWidth || 1
    }
  }

  get pixelHeight(): number {
    if (this.height) {
      return Math.ceil(this.height * this.pixelRatio)
    }
    else {
      return this.sourceHeight || 1
    }
  }

  constructor(properties: Texture2DProperties<T> = {}) {
    super()
    this.setProperties(properties)
    this.updateSize()
  }

  isValid(): boolean {
    return Boolean(this.width && this.height)
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'width':
      case 'height':
        this.isPowerOfTwo = isPow2(this.pixelWidth) && isPow2(this.pixelHeight)
        break
      case 'source':
        this.updateSize()
        break
    }
  }

  updateSize(): void {
    if (!this.width) {
      this.width = Math.floor(this.sourceWidth / this.pixelRatio)
    }

    if (!this.height) {
      this.height = Math.floor(this.sourceHeight / this.pixelRatio)
    }
  }

  activate(renderer: WebGLRenderer, location?: number): boolean {
    if (this.isValid()) {
      renderer.texture.bind(this, location)
      return true
    }
    return false
  }

  inactivate(renderer: WebGLRenderer): void {
    renderer.texture.unbind(this)
  }

  protected override _destroy(): void {
    super._destroy()

    if (SUPPORTS_IMAGE_BITMAP && this.source instanceof ImageBitmap) {
      this.source.close()
    }
  }
}
