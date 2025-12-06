import type { GlTextureUploader } from '../GlTextureUploader'

export const image: GlTextureUploader = {
  id: 'image',
  upload: (source, glTexture, gl, webGLVersion) => {
    const glWidth = glTexture.width
    const glHeight = glTexture.height
    const textureWidth = source.pixelWidth ?? source.width
    const textureHeight = source.pixelHeight ?? source.width
    const sourceWidth = source.sourceWidth ?? textureWidth
    const sourceHeight = source.sourceHeight ?? sourceWidth
    if (sourceWidth < textureWidth || sourceHeight < textureHeight) {
      if (glWidth !== textureWidth || glHeight !== textureHeight) {
        gl.texImage2D(
          glTexture.target,
          0,
          glTexture.internalFormat,
          textureWidth,
          textureHeight,
          0,
          glTexture.format,
          glTexture.type,
          null,
        )
      }

      if (webGLVersion === 2) {
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          sourceWidth,
          sourceHeight,
          glTexture.format,
          glTexture.type,
          source.source as TexImageSource,
        )
      }
      else {
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          glTexture.format,
          glTexture.type,
          source.source as TexImageSource,
        )
      }
    }
    else if (glWidth === textureWidth && glHeight === textureHeight) {
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        glTexture.format,
        glTexture.type,
        source.source as TexImageSource,
      )
    }
    else if (webGLVersion === 2) {
      gl.texImage2D(
        glTexture.target,
        0,
        glTexture.internalFormat,
        textureWidth,
        textureHeight,
        0,
        glTexture.format,
        glTexture.type,
        source.source as TexImageSource,
      )
    }
    else {
      gl.texImage2D(
        glTexture.target,
        0,
        glTexture.internalFormat,
        glTexture.format,
        glTexture.type,
        source.source as TexImageSource,
      )
    }

    glTexture.width = textureWidth
    glTexture.height = textureHeight
  },
}
