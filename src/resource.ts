import type { Canvas } from './canvas'

export interface Resource {
  name: string
  data: TexImageSource
}

export type InternalResource = {
  loading: boolean
  texture: WebGLTexture | null
}

export function registerResource(canvas: Canvas, resource: Resource) {
  const { gl, resources } = canvas
  const { name, data } = resource

  const internalResource: InternalResource = {
    loading: true,
    texture: null,
  }

  function loadTexture() {
    internalResource.texture = gl.createTexture()
    if (internalResource.texture) {
      gl.bindTexture(gl.TEXTURE_2D, internalResource.texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data)
    }
    internalResource.loading = false
  }

  if (data instanceof HTMLImageElement) {
    data.addEventListener('load', loadTexture, { once: true })
  } else if (data instanceof HTMLVideoElement) {
    let playing = false
    let timeupdate = false
    data.addEventListener('playing', () => {
      playing = true
      playing && timeupdate && loadTexture()
    }, true)
    data.addEventListener('timeupdate', () => {
      timeupdate = true
      playing && timeupdate && loadTexture()
    }, true)
  } else {
    loadTexture()
  }

  resources.set(name, internalResource)
}
