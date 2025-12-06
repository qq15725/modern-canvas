import type { TextureLike } from '../../shared'

export const mipmapScaleModeMap = {
  linear: {
    linear: 9987,
    nearest: 9985,
  },
  nearest: {
    linear: 9986,
    nearest: 9984,
  },
}

export const scaleModeMap = {
  linear: 9729,
  nearest: 9728,
}

export const compareFuncMap = {
  'never': 512,
  'less': 513,
  'equal': 514,
  'less-equal': 515,
  'greater': 516,
  'not-equal': 517,
  'greater-equal': 518,
  'always': 519,
}

export const wrapModeMap = {
  'clamp-to-edge': 33071,
  'repeat': 10497,
  'mirror-repeat': 33648,
}

export function updateTextureStyle(
  texture: TextureLike,
  gl: WebGL2RenderingContext,
  mipmaps: boolean,
  anisotropicExt: EXT_texture_filter_anisotropic | undefined,
  glFunctionName: 'samplerParameteri' | 'texParameteri',
  firstParam: 3553 | WebGLSampler,
  forceClamp: boolean,
  firstCreation: boolean,
): void {
  const {
    addressModeU = 'repeat',
    addressModeV = 'repeat',
    addressModeW = 'repeat',
    magFilter = 'linear',
    minFilter = 'linear',
    mipmapFilter = 'linear',
    maxAnisotropy = 0,
    compare,
  } = texture

  const castParam = firstParam as 3553

  if (!firstCreation
    || addressModeU !== 'repeat'
    || addressModeV !== 'repeat'
    || addressModeW !== 'repeat'
  ) {
    const wrapModeS = wrapModeMap[forceClamp ? 'clamp-to-edge' : addressModeU]
    const wrapModeT = wrapModeMap[forceClamp ? 'clamp-to-edge' : addressModeV]
    const wrapModeR = wrapModeMap[forceClamp ? 'clamp-to-edge' : addressModeW]

    gl[glFunctionName](castParam, gl.TEXTURE_WRAP_S, wrapModeS)
    gl[glFunctionName](castParam, gl.TEXTURE_WRAP_T, wrapModeT)

    if (gl.TEXTURE_WRAP_R) {
      gl[glFunctionName](castParam, gl.TEXTURE_WRAP_R, wrapModeR)
    }
  }

  if (!firstCreation || magFilter !== 'linear') {
    gl[glFunctionName](castParam, gl.TEXTURE_MAG_FILTER, scaleModeMap[magFilter])
  }

  if (mipmaps) {
    if (!firstCreation || mipmapFilter !== 'linear') {
      const glFilterMode = mipmapScaleModeMap[minFilter][mipmapFilter]
      gl[glFunctionName](castParam, gl.TEXTURE_MIN_FILTER, glFilterMode)
    }
  }
  else {
    gl[glFunctionName](castParam, gl.TEXTURE_MIN_FILTER, scaleModeMap[minFilter])
  }

  if (anisotropicExt && maxAnisotropy > 1) {
    const level = Math.min(maxAnisotropy, gl.getParameter(anisotropicExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT))
    gl[glFunctionName](castParam, anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, level)
  }

  if (compare) {
    gl[glFunctionName](castParam, gl.TEXTURE_COMPARE_FUNC, compareFuncMap[compare])
  }
}
