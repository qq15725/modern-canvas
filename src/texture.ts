import type { Canvas } from './canvas'

export interface RegisterTextureOptions {
  name: string
  source: TexImageSource
}

export type Texture = {
  loading: boolean
  glTexture: WebGLTexture | null
}

export function registerTexture(canvas: Canvas, options: RegisterTextureOptions) {
  const { gl, textures } = canvas
  const { name, source } = options

  const texture: Texture = {
    loading: true,
    glTexture: null,
  }

  function bindGlTexture() {
    texture.glTexture = gl.createTexture()
    if (texture.glTexture) {
      gl.bindTexture(gl.TEXTURE_2D, texture.glTexture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    }
    texture.loading = false
  }

  if (source instanceof HTMLImageElement) {
    source.addEventListener('load', bindGlTexture, { once: true })
  } else {
    bindGlTexture()
  }

  textures.set(name, texture)
}
