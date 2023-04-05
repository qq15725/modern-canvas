import type { Canvas } from './canvas'

export interface RegisterTextureOptions {
  name: string
  source: TexImageSource
}

export type Texture = {
  glTexture: WebGLTexture
}

export function registerTexture(canvas: Canvas, options: RegisterTextureOptions) {
  const { gl, textures } = canvas
  const { name, source, ...texture } = options

  const glTexture = gl.createTexture()
  if (!glTexture) {
    return
  }
  gl.bindTexture(gl.TEXTURE_2D, glTexture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)

  textures.set(name, {
    ...texture,
    glTexture,
  })
}
