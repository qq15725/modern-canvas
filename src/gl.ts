import type { Canvas } from './canvas'

export interface GlBufferTargets {
  arrayBuffer: GLenum
  elementArrayBuffer: GLenum
}

export interface GlDrawModes {
  points: GLenum
  linear: GLenum
  triangles: GLenum
  triangleStrip: GLenum
  triangleFan: GLenum
}

export type GlSlType = 'float'
| 'vec2'
| 'vec3'
| 'vec4'
| 'int'
| 'ivec2'
| 'ivec3'
| 'ivec4'
| 'uint'
| 'uvec2'
| 'uvec3'
| 'uvec4'
| 'bool'
| 'bvec2'
| 'bvec3'
| 'bvec4'
| 'mat2'
| 'mat3'
| 'mat4'
| 'sampler2D'
| 'samplerCube'
| 'sampler2DArray'

export type GlSlTypes = Record<number, GlSlType>

export interface GlExtensions {
  loseContext: WEBGL_lose_context | null
}

export function provideGl(canvas: Canvas, glOptions?: WebGLContextAttributes) {
  canvas.singleton('gl', () => {
    const { view } = canvas
    // TODO support webgl2
    const gl = (
      view.getContext('webgl', glOptions)
      || view.getContext('experimental-webgl', glOptions)
    ) as WebGLRenderingContext
    if (!gl) throw new Error('failed to getContext for webgl')
    return gl
  })

  canvas.singleton('glDefaultTexture', () => {
    const { gl, width, height } = canvas
    const glTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, glTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    return glTexture
  })

  canvas.singleton('glDefaultFramebuffers', () => {
    const { gl, width, height } = canvas
    return Array.from({ length: 2 }, () => {
      const glTexture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, glTexture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      const glFramebuffer = gl.createFramebuffer()
      gl.bindFramebuffer(gl.FRAMEBUFFER, glFramebuffer)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glTexture, 0)
      return {
        glFramebuffer,
        glTexture,
      }
    })
  })

  canvas.singleton('glBufferTargets', () => ({
    arrayBuffer: canvas.gl.ARRAY_BUFFER,
    elementArrayBuffer: canvas.gl.ELEMENT_ARRAY_BUFFER,
  }))

  canvas.singleton('glDrawModes', () => ({
    points: canvas.gl.POINTS,
    linear: canvas.gl.LINEAR,
    triangles: canvas.gl.TRIANGLES,
    triangleStrip: canvas.gl.TRIANGLE_STRIP,
    triangleFan: canvas.gl.TRIANGLE_FAN,
  }))

  canvas.singleton('glSlTypes', () => {
    const gl = canvas.gl as any
    return {
      [gl.FLOAT]: 'float',
      [gl.FLOAT_VEC2]: 'vec2',
      [gl.FLOAT_VEC3]: 'vec3',
      [gl.FLOAT_VEC4]: 'vec4',
      [gl.INT]: 'int',
      [gl.INT_VEC2]: 'ivec2',
      [gl.INT_VEC3]: 'ivec3',
      [gl.INT_VEC4]: 'ivec4',
      [gl.UNSIGNED_INT]: 'uint',
      [gl.UNSIGNED_INT_VEC2]: 'uvec2',
      [gl.UNSIGNED_INT_VEC3]: 'uvec3',
      [gl.UNSIGNED_INT_VEC4]: 'uvec4',
      [gl.BOOL]: 'bool',
      [gl.BOOL_VEC2]: 'bvec2',
      [gl.BOOL_VEC3]: 'bvec3',
      [gl.BOOL_VEC4]: 'bvec4',
      [gl.FLOAT_MAT2]: 'mat2',
      [gl.FLOAT_MAT3]: 'mat3',
      [gl.FLOAT_MAT4]: 'mat4',
      [gl.SAMPLER_2D]: 'sampler2D',
      [gl.INT_SAMPLER_2D]: 'sampler2D',
      [gl.UNSIGNED_INT_SAMPLER_2D]: 'sampler2D',
      [gl.SAMPLER_CUBE]: 'samplerCube',
      [gl.INT_SAMPLER_CUBE]: 'samplerCube',
      [gl.UNSIGNED_INT_SAMPLER_CUBE]: 'samplerCube',
      [gl.SAMPLER_2D_ARRAY]: 'sampler2DArray',
      [gl.INT_SAMPLER_2D_ARRAY]: 'sampler2DArray',
      [gl.UNSIGNED_INT_SAMPLER_2D_ARRAY]: 'sampler2DArray',
    }
  })

  canvas.singleton('glExtensions', () => ({
    loseContext: canvas.gl.getExtension('WEBGL_lose_context'),
  }))
}
