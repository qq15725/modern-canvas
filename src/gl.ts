import type { Canvas } from './canvas'

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

export interface GlFramebuffer {
  buffer: WebGLFramebuffer | null
  depthBuffer: WebGLRenderbuffer | null
  texture: WebGLTexture | null
  resize(): void
}

export interface GlExtensions {
  loseContext: WEBGL_lose_context | null
}

export function provideGl(canvas: Canvas, options?: WebGLContextAttributes) {
  canvas.singleton('gl', () => {
    const { view } = canvas
    // TODO support webgl2
    const gl = (
      view.getContext('webgl', options)
      || view.getContext('experimental-webgl', options)
    ) as WebGLRenderingContext
    if (!gl) throw new Error('failed to getContext for webgl')

    // init
    const width = gl.drawingBufferWidth
    const height = gl.drawingBufferHeight
    gl.viewport(0, 0, width, height)

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.depthMask(false)

    return gl
  })

  canvas.singleton('glDefaultTexture', () => {
    const { gl, width, height } = canvas
    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    return texture
  })

  canvas.singleton<GlFramebuffer[]>('glFramebuffers', () => {
    const { gl } = canvas
    return Array.from({ length: 2 }, () => {
      const texture = gl.createTexture()
      const buffer = gl.createFramebuffer()
      const depthBuffer = gl.createRenderbuffer()
      function resize() {
        const { width, height } = canvas
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer)
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height)
      }
      resize()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer)
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer)
      return {
        buffer,
        depthBuffer,
        texture,
        resize,
      }
    })
  })

  canvas.singleton('glDrawModes', () => {
    const { gl } = canvas
    return {
      points: gl.POINTS,
      linear: gl.LINEAR,
      triangles: gl.TRIANGLES,
      triangleStrip: gl.TRIANGLE_STRIP,
      triangleFan: gl.TRIANGLE_FAN,
    }
  })

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
