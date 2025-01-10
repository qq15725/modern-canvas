import type { WebGLRenderer, WebGLTextureOptions } from '../../../core'
import { IN_BROWSER, SUPPORTS_CREATE_IMAGE_BITMAP } from '../../../core'
import { Texture } from './Texture'

export interface ImageTextureOptions {
  autoLoad?: boolean
  useBitmap?: boolean
  crossorigin?: boolean | string | null
  // alphaMode?: ALPHA_MODES
}

function resolveOptions(options?: ImageTextureOptions): Required<ImageTextureOptions> {
  return {
    autoLoad: Boolean(options?.autoLoad ?? true),
    useBitmap: Boolean(options?.useBitmap ?? true) && SUPPORTS_CREATE_IMAGE_BITMAP,
    crossorigin: options?.crossorigin ?? null,
  }
}

export class ImageTexture extends Texture<HTMLImageElement> {
  bitmap?: ImageBitmap
  useBitmap: boolean
  preserveBitmap = false

  protected _loadSource?: Promise<this>
  protected _loadBitmap?: Promise<this>

  constructor(
    source: HTMLImageElement,
    options?: ImageTextureOptions,
  ) {
    const resovled = resolveOptions(options)

    super(source)

    const src = source.src
    const isSVG = src.includes('.svg') || src.startsWith('data:image/svg+xml')
    this.useBitmap = resovled.useBitmap && !isSVG
    // this.alphaMode = typeof resovled.alphaMode === 'number' ? resovled.alphaMode : null

    if (resovled.autoLoad) {
      this.load()
    }
  }

  async load(): Promise<this> {
    if (!this._loadSource) {
      this._loadSource = new Promise((resolve) => {
        this._loadSource = undefined

        const source = this.source

        const onResolve = (): void => {
          source.onload = null
          source.onerror = null
        }

        const onLoad = (): void => {
          onResolve()
          this.requestUpload()
          if (this.useBitmap) {
            this.genBitmap().finally(() => resolve(this))
          }
          else {
            resolve(this)
          }
        }

        const onError = (error: string | Event): void => {
          onResolve()
          console.warn(`Failed to load ImageTexture, src: ${source.src}`, error)
          this.emit('error', error)
          resolve(this)
        }

        if (source.complete && source.src) {
          onLoad()
        }
        else {
          source.onload = onLoad
          source.onerror = onError
        }
      })
    }

    return this._loadSource
  }

  genBitmap(): Promise<this> {
    if (this._loadBitmap) {
      return this._loadBitmap
    }

    if (this.bitmap || !SUPPORTS_CREATE_IMAGE_BITMAP) {
      return Promise.resolve(this)
    }

    const src = this.source
    const cors = !src.crossOrigin || src.crossOrigin === 'anonymous'

    this._loadBitmap = fetch(src.src, {
      mode: cors ? 'cors' : 'no-cors',
    })
      .then(r => r.blob())
      .then((blob) => {
        return createImageBitmap(blob, 0, 0, src.width, src.height, {
          // TODO
          premultiplyAlpha: 'premultiply',
        })
      })
      .then((bitmap) => {
        this.bitmap = bitmap
        this.requestUpload()
        this._loadBitmap = undefined
        return this
      })
      .catch((err) => {
        console.warn('Failed to genBitmap', err)
        return this
      })

    return this._loadBitmap
  }

  /** @internal */
  override _glTextureOptions(renderer: WebGLRenderer): WebGLTextureOptions {
    return {
      ...super._glTextureOptions(renderer),
      value: this.bitmap ?? this.source,
    }
  }

  override upload(renderer: WebGLRenderer): boolean {
    if (this.useBitmap) {
      if (!this.bitmap) {
        this.genBitmap()
        return false
      }
    }
    else {
      const source = this.source
      if (IN_BROWSER && source instanceof HTMLImageElement) {
        if (!source.complete || source.naturalWidth === 0) {
          return false
        }
      }
    }

    const result = super.upload(renderer)

    // TODO
    if (this.preserveBitmap && this.bitmap) {
      this.bitmap.close()
      this.bitmap = undefined
    }

    return result
  }
}
