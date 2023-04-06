import type { GlSlType } from './gl'
import type { Canvas } from './canvas'

export interface RegisterProgramOptions {
  name: string
  vert: string
  frag: string
  uniforms?: Record<string, any>
  textureName?: string
  vertexBufferName: string
  indexBufferName?: string
  drawMode?: keyof Canvas['glDrawModes']
}

export interface UseProgramOptions {
  name: string
  uniforms?: Record<string, any>
  textureName?: string
}

export interface GlActivatedUniform {
  type: GlSlType
  isArray: boolean
  location: WebGLUniformLocation | null
}

export type Program = RegisterProgramOptions & {
  glProgram: WebGLProgram
  glActivatedUniforms: Record<string, GlActivatedUniform>
  glDrawCount: number
}

export function registerProgram(canvas: Canvas, options: RegisterProgramOptions) {
  const { gl, programs, buffers, glSlTypes } = canvas

  const {
    name,
    vert,
    frag,
    vertexBufferName,
    uniforms,
  } = options

  if (programs.has(name)) return

  const glShaderSources = [
    { type: gl.VERTEX_SHADER, source: vert },
    { type: gl.FRAGMENT_SHADER, source: frag.includes('precision') ? frag : `precision mediump float;\n${ frag }` },
  ]

  // create webgl shaders
  const glShaders = glShaderSources.map(({ type, source }) => {
    const glShader = gl.createShader(type)
    if (!glShader) throw new Error('failed to create shader')
    gl.shaderSource(glShader, source)
    gl.compileShader(glShader)
    if (!gl.getShaderParameter(glShader, gl.COMPILE_STATUS)) {
      throw new Error(`failed to compiling shader:\n${ source }\n${ gl.getShaderInfoLog(glShader) }`)
    }
    return glShader
  })

  // create webgl program
  const glProgram = gl.createProgram()
  if (!glProgram) throw new Error('failed to create program')
  glShaders.forEach(shader => gl.attachShader(glProgram, shader))
  gl.linkProgram(glProgram)
  glShaders.forEach(shader => gl.deleteShader(shader))
  if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS)) {
    throw new Error(`failed to initing program: ${ gl.getProgramInfoLog(glProgram) }`)
  }

  gl.useProgram(glProgram)

  // bind webgl vertex buffer
  const vertexBuffer = buffers.get(vertexBufferName)
  if (!vertexBuffer) return
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer.glBuffer)
  const location = gl.getAttribLocation(glProgram, 'aPosition')
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(location)

  // resovle actived uniforms info
  const glActivatedUniforms: Record<string, GlActivatedUniform> = {}
  for (let len = gl.getProgramParameter(glProgram, gl.ACTIVE_UNIFORMS), i = 0; i < len; i++) {
    const gLActiveInfo = gl.getActiveUniform(glProgram, i)
    if (!gLActiveInfo) continue
    const { name, type } = gLActiveInfo
    const varName = name.replace(/\[.*?]$/, '')
    glActivatedUniforms[varName] = {
      type: glSlTypes[type],
      isArray: !!(name.match(/\[.*?]$/)),
      location: gl.getUniformLocation(glProgram, varName),
    }
  }

  if (glActivatedUniforms.uSampler) {
    gl.uniform1i(glActivatedUniforms.uSampler.location, 0)
  }

  const program = {
    ...options,
    glProgram,
    glActivatedUniforms,
    glDrawCount: vertexBuffer.numberPoints / 2,
  }

  programs.set(name, program)

  useProgramUniforms(canvas, program, uniforms)
}

export function useProgram(canvas: Canvas, options: UseProgramOptions) {
  const { gl, programs } = canvas
  const { name, textureName, uniforms } = options

  const program = programs.get(name)
  if (!program) return

  const {
    drawMode = 'triangles',
    glProgram,
    glDrawCount,
  } = program

  // use texture
  if (textureName) {
    gl.bindTexture(
      gl.TEXTURE_2D,
      canvas.textures.get(textureName)?.glTexture
      ?? canvas.glDefaultTexture,
    )
  }

  // use program
  gl.useProgram(glProgram)
  useProgramUniforms(canvas, program, uniforms)
  gl.drawArrays(canvas.glDrawModes[drawMode], 0, glDrawCount)
}

export function useProgramUniforms(canvas: Canvas, program: Program, uniforms?: Record<string, any>) {
  if (!uniforms) return
  const { gl } = canvas
  const { glActivatedUniforms } = program
  for (const [key, value] of Object.entries(uniforms)) {
    if (!(key in glActivatedUniforms)) continue
    const { type, isArray, location } = glActivatedUniforms[key]
    switch (type) {
      case 'float':
        if (isArray) {
          gl.uniform1fv(location, value)
        } else {
          gl.uniform1f(location, value)
        }
        break
      case 'bool':
      case 'int':
        if (isArray) {
          gl.uniform1iv(location, value)
        } else {
          gl.uniform1i(location, value)
        }
        break
      case 'vec2':
        gl.uniform2fv(location, value)
        break
      case 'vec3':
        gl.uniform3fv(location, value)
        break
      case 'vec4':
        gl.uniform4fv(location, value)
        break
    }
  }
}
