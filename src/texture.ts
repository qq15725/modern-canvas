import type { App } from './app'

export interface Texture {
  loading: boolean
  value: WebGLTexture | null
  source: TexImageSource
}

export function registerTexture(app: App, name: number, source: TexImageSource) {
  const { context, textures } = app

  const texture: Texture = {
    loading: true,
    value: null,
    source,
  }

  textures.set(name, texture)

  return new Promise<void>(resolve => {
    if (source instanceof HTMLImageElement) {
      source.addEventListener('load', load, { once: true })
    } else if (source instanceof HTMLVideoElement) {
      source.addEventListener('canplay', load, { once: true })
      source.addEventListener('timeupdate', () => {
        context.bindTexture(context.TEXTURE_2D, texture.value)
        context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, source)
      })
    } else {
      load()
    }

    function load() {
      texture.value = context.createTexture()
      if (texture.value) {
        context.bindTexture(context.TEXTURE_2D, texture.value)
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR)
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR)
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE)
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE)
        context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, source)
      }
      texture.loading = false
      if (source instanceof HTMLVideoElement) {
        source.currentTime = 0.01
      }
      resolve()
    }
  })
}
