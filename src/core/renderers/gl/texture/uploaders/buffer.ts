import type { GlTextureUploader } from '../GlTextureUploader'

export const buffer: GlTextureUploader = {
  id: 'buffer',
  upload: (texture, glTexture, gl) => {
    if (glTexture.width === texture.width || glTexture.height === texture.height) {
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        texture.width,
        texture.height,
        glTexture.format,
        glTexture.type,
        texture.source as ArrayBufferView,
      )
    }
    else {
      gl.texImage2D(
        glTexture.target,
        0,
        glTexture.internalFormat,
        texture.width,
        texture.height,
        0,
        glTexture.format,
        glTexture.type,
        texture.source as ArrayBufferView | null,
      )
    }

    glTexture.width = texture.width
    glTexture.height = texture.height
  },
}
