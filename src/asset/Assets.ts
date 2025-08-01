import type { Loader } from './loaders'
import { Ticker } from '../core'
import {
  FontLoader,
  GIFLoader,
  JSONLoader,
  LottieLoader,
  TextLoader,
  TextureLoader,
  VideoLoader,
} from './loaders'
import { parseMimeType } from './parseMimeType'

const SUPPORTS_WEAK_REF = 'WeakRef' in globalThis

export type AssetHandler = (url: string, options?: any) => any | Promise<any>

export interface Assets {
  font: FontLoader
  gif: GIFLoader
  json: JSONLoader
  lottie: LottieLoader
  text: TextLoader
  texture: TextureLoader
  video: VideoLoader
}

export class Assets {
  defaultHandler: AssetHandler = (url: string) => this.fetch(url)
  protected _handlers = new Map<string, AssetHandler>()
  protected _handleing = new Map<string, Promise<any>>()
  protected _handled = new Map<string, any | WeakRef<any>>()
  protected _gc = SUPPORTS_WEAK_REF
    ? new FinalizationRegistry<string>((id) => {
      const ref = this.get<any>(id)
      if (ref && 'free' in ref) {
        ref.free()
      }
      this._handled.delete(id)
    })
    : undefined

  constructor() {
    if (!SUPPORTS_WEAK_REF) {
      Ticker.on(this.gc.bind(this), { sort: 2 })
    }
  }

  use(loader: Loader): this {
    loader.install(this)
    return this
  }

  register(mimeType: string, handler: AssetHandler): this {
    this._handlers.set(mimeType, handler)
    return this
  }

  fetch(url: string): Promise<Response> {
    return fetch(url)
  }

  protected _fixSVG(dataURI: string): string {
    let xml
    if (dataURI.includes(';base64,')) {
      xml = atob(dataURI.split(',')[1])
    }
    else {
      // ;charset=utf-8,
      xml = decodeURIComponent(dataURI.split(',')[1])
    }
    const svg = new DOMParser().parseFromString(xml, 'image/svg+xml').documentElement
    const width = svg.getAttribute('width')
    const height = svg.getAttribute('height')
    const isValidWidth = width && /^[\d.]+$/.test(width)
    const isValidHeight = height && /^[\d.]+$/.test(height)
    if (!isValidWidth || !isValidHeight) {
      const viewBox = svg.getAttribute('viewBox')?.split(' ').map(v => Number(v))
      if (!isValidWidth) {
        svg.setAttribute('width', String(viewBox ? viewBox[2] - viewBox[0] : 512))
      }
      if (!isValidHeight) {
        svg.setAttribute('height', String(viewBox ? viewBox[3] - viewBox[1] : 512))
      }
    }
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`
  }

  async fetchImageBitmap(url: string, options?: ImageBitmapOptions): Promise<ImageBitmap> {
    if (url.startsWith('http')) {
      return await this.fetch(url)
        .then(rep => rep.blob())
        .then((blob) => {
          if (blob.type === 'image/svg+xml') {
            return blob.text()
              .then((xml) => {
                return this.fetchImageBitmap(
                  this._fixSVG(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`),
                  options,
                )
              })
          }
          return createImageBitmap(blob, options)
        })
    }
    else {
      if (url.startsWith('data:image/svg+xml;')) {
        url = this._fixSVG(url)
      }
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image()
        img.src = url
        img.onload = () => {
          img.decode().finally(() => {
            resolve(img)
          })
        }
      }).then(img => createImageBitmap(img, options))
    }
  }

  get<T>(id: string): T | undefined {
    let result = this._handled.get(id)
    if (SUPPORTS_WEAK_REF && result instanceof WeakRef) {
      result = result.deref()
      if (!result)
        this._handleing.delete(id)
    }
    return result
  }

  set(id: string, value: any): void {
    let handled = value
    if (SUPPORTS_WEAK_REF && typeof value === 'object') {
      this._gc!.register(value, id)
      handled = new WeakRef(value)
    }
    this._handled.set(id, handled)
  }

  async loadBy<T>(id: string, handler: () => Promise<T>): Promise<T> {
    const result = this.get<T>(id) ?? this._handleing.get(id)
    if (result)
      return result
    const promise = handler()
      .then((result) => {
        this.set(id, result)
        return result
      })
      .finally(() => {
        this._handleing.delete(id)
      })
    this._handleing.set(id, promise)
    return promise
  }

  async load<T>(url: string, options?: any): Promise<T> {
    return this.loadBy(url, async () => {
      const mimeType = await parseMimeType(url)
      const handler = this._handlers.get(mimeType) ?? this.defaultHandler
      return handler(url, options)
    })
  }

  async waitUntilLoad(): Promise<void> {
    await Promise.all(
      Array.from(this._handleing.values())
        .map(v => v.catch((err) => {
          console.error(err)
          return undefined
        })),
    )
  }

  gc(): void {
    this._handled.forEach((_, id) => {
      const ref = this.get<any>(id)
      if (ref && 'free' in ref) {
        ref.free()
      }
    })
    this._handled.clear()
  }
}

export const assets = new Assets()
  .use(new FontLoader())
  .use(new GIFLoader())
  .use(new JSONLoader())
  .use(new LottieLoader())
  .use(new TextLoader())
  .use(new TextureLoader())
  .use(new VideoLoader())
