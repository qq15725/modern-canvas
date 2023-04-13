import type { Canvas } from './canvas'

export interface Resource {
  name: string
  source: TexImageSource
}

export type InternalResource = {
  loading: boolean
  texture: WebGLTexture | null
  source: TexImageSource
}

export function registerResource(canvas: Canvas, resource: Resource) {
  const { gl, resources } = canvas
  const { name, source } = resource

  const internalResource: InternalResource = {
    loading: true,
    texture: null,
    source,
  }

  function loadTexture() {
    internalResource.texture = gl.createTexture()
    if (internalResource.texture) {
      gl.bindTexture(gl.TEXTURE_2D, internalResource.texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    }
    internalResource.loading = false
  }

  if (source instanceof HTMLImageElement) {
    source.addEventListener('load', loadTexture, { once: true })
  } else if (source instanceof HTMLVideoElement) {
    source.addEventListener('canplay', () => {
      loadTexture()
      source.currentTime = 0.01
    }, { once: true })
    source.addEventListener('timeupdate', () => {
      gl.bindTexture(gl.TEXTURE_2D, internalResource.texture)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    })
  } else {
    loadTexture()
  }

  resources.set(name, internalResource)
}
