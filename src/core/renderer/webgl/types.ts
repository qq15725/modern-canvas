import type { RawWeakMap } from 'modern-idoc'

export type WebGLBufferTarget
  = | 'array_buffer'
    | 'element_array_buffer'

export interface WebGLBufferOptions {
  target?: WebGLBufferTarget
  usage?: WebGLBufferUsage
  data: BufferSource | number[] | null
}

export type WebGLBufferUsage
  = | 'static_draw'
    | 'dynamic_draw'

export interface WebGLBufferMeta {
  id: number
  target?: WebGLBufferTarget
  usage?: WebGLBufferUsage
  length: number
  byteLength: number
  bytesPerElement: number
}

export type WebGLDrawMode
  = | 'points'
    | 'line_strip'
    | 'line_loop'
    | 'lines'
    | 'triangle_strip'
    | 'triangle_fan'
    | 'triangles'

export interface WebGLDrawOptions {
  mode?: WebGLDrawMode
  count?: number
  first?: number
  bytesPerElement?: number
  instanceCount?: number
}

export interface WebGLExtensions {
  // WebGL and WebGL 2
  loseContext?: WEBGL_lose_context | null
  anisotropicFiltering?: EXT_texture_filter_anisotropic | null
  floatTextureLinear?: OES_texture_float_linear | null
  s3tc?: WEBGL_compressed_texture_s3tc | null
  s3tcSRGB?: WEBGL_compressed_texture_s3tc_srgb | null
  etc?: WEBGL_compressed_texture_etc | null
  etc1?: WEBGL_compressed_texture_etc1 | null
  pvrtc?: any | null
  atc?: any | null
  astc?: WEBGL_compressed_texture_astc | null

  // WebGL
  instancedArrays?: ANGLE_instanced_arrays | null
  drawBuffers?: WEBGL_draw_buffers | null
  depthTexture?: WEBGL_depth_texture | null
  vertexArrayObject?: OES_vertex_array_object | null
  uint32ElementIndex?: OES_element_index_uint | null
  floatTexture?: OES_texture_float | null
  textureHalfFloat?: OES_texture_half_float | null
  textureHalfFloatLinear?: OES_texture_half_float_linear | null

  // WebGL 2
  colorBufferFloat?: EXT_color_buffer_float | null
}

export interface WebGLFramebufferOptions {
  width: number
  height: number
  mipLevel?: number
  msaa?: boolean
  stencil?: boolean
  depth?: boolean
  depthTexture?: WebGLTexture | null
  colorTextures?: WebGLTexture[]
}

export interface WebGLFramebufferMeta extends Required<WebGLFramebufferOptions> {
  multisample: number
  stencilBuffer: WebGLBuffer | null
  msaaRenderBuffers: WebGLRenderbuffer[]
  framebuffer: WebGLFramebuffer | null
}

type Pick<T> = T extends string
  ? T extends Uppercase<T>
    ? Lowercase<T>
    : never
  : never

export type WebGLTarget = Pick<keyof WebGL2RenderingContext>

export interface WebGLProgramMeta {
  attributes: Map<string, {
    type: WebGLTarget
    size: number
    name: string
    location: number
  }>
  uniforms: Map<string, {
    index: number
    type: WebGLTarget
    size: number
    isArray: boolean
    name: string
    location: WebGLUniformLocation | null
  }>
  boundUniforms: RawWeakMap<object, any>
}

export interface WebGLProgramOptions {
  vert: string
  frag: string
}

export type WebGLTextureFilterMode
  = | 'linear'
    | 'nearest'
    | 'nearest_mipmap_nearest'
    | 'linear_mipmap_nearest'
    | 'nearest_mipmap_linear'
    | 'linear_mipmap_linear'

export type WebGLTextureLocation = number

export interface WebGLTextureMeta extends Omit<WebGLTextureOptions, 'value'> {
  //
}

export interface WebGLTextureOptions {
  value: WebGLTextureSource
  target?: WebGLTextureTarget
  location?: WebGLTextureLocation
  filterMode?: WebGLTextureFilterMode
  wrapMode?: WebGLTextureWrapMode
  anisoLevel?: number
}

export type WebGLTextureSource
  = | TexImageSource
    | null
    | {
      width: number
      height: number
      pixels: ArrayBufferView | null
    }

export type WebGLTextureTarget
  = | 'texture_2d'
    | 'texture_cube_map'

export type WebGLTextureWrapMode
  = | 'repeat'
    | 'clamp_to_edge'
    | 'mirrored_repeat'

export interface WebGLVertexArrayObjectMeta {
  attributes: Record<string, WebGLVertexAttrib>
  elementArrayBuffer: WebGLBuffer | null
}

export interface WebGLVertexArrayObjectOptions {
  attributes?: Record<string, WebGLBuffer | WebGLVertexAttrib>
  elementArrayBuffer?: WebGLBuffer | null
}

export type WebGLVertexAttribType
  = | 'float'
    | 'unsigned_byte'
    | 'unsigned_short'

export interface WebGLVertexAttrib {
  buffer: WebGLBuffer
  enable?: boolean
  size?: number
  type?: WebGLVertexAttribType
  normalized?: boolean
  stride?: number
  offset?: number
  divisor?: number
}

export interface WebGLViewport {
  x: number
  y: number
  width: number
  height: number
}
