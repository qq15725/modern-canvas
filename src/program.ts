import type { Canvas } from './canvas'

export interface RegisterProgramOptions {
  name: string
  mode: 'point' | 'line' | 'triangle'
  vertices: Float32Array | number[]
  indexes?: Uint16Array | number[]
  vert: string
  frag: string
  uniforms?: Record<string, any>
  texture?: string
}

export interface UseProgramOptions {
  name: string
  uniforms?: Record<string, any>
  texture?: string
}

export type Program = RegisterProgramOptions & {
  glProgram: WebGLProgram
  glDrawCount: number
}

export function registerProgram(canvas: Canvas, options: RegisterProgramOptions) {
  const { gl, programs } = canvas

  const {
    name,
    vertices,
    vert,
    frag,
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

  // create webgl vertex buffer
  const glBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(0)

  gl.useProgram(glProgram)

  // bind attrib
  gl.bindAttribLocation(glProgram, 0, 'aPosition')

  // resovle actived uniforms info
  gl.uniform1i(gl.getUniformLocation(glProgram, 'uSampler'), 0)

  // calc draw count
  const glDrawCount = vertices.length / 2

  programs.set(name, {
    ...options,
    glProgram,
    glDrawCount,
  })
}

export function useProgram(canvas: Canvas, options: UseProgramOptions) {
  const { gl, programs, textures } = canvas
  const { name, texture: textureName, uniforms } = options

  const program = programs.get(name)
  if (!program) return

  const { mode, glProgram, glDrawCount } = program

  // use texture
  if (textureName) {
    const texture = textures.get(textureName)
    if (texture) {
      gl.bindTexture(gl.TEXTURE_2D, texture.glTexture)
    }
  }

  // use program
  gl.useProgram(glProgram)

  if (uniforms) {
    for (const [key, value] of Object.entries(uniforms)) {
      // TODO
      gl.uniform4fv(gl.getUniformLocation(glProgram, key), value)
    }
  }

  // const isLast = index === programs.size - 1
  // const textureBuffer = textureBuffers[index++ % 2]
  // gl.useProgram(program)
  // uniforms.uTime?.location && gl.uniform1f(uniforms.uTime.location, time)
  // if (isLast) {
  //   gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  // } else {
  //   gl.bindFramebuffer(gl.FRAMEBUFFER, textureBuffer.buffer)
  // }
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
  gl.clearColor(1, 1, 1, 1)
  gl.clearDepth(1)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.enable(gl.DEPTH_TEST)

  switch (mode) {
    case 'triangle':
      gl.drawArrays(gl.TRIANGLES, 0, glDrawCount)
      break
  }

  // !isLast && gl.bindTexture(gl.TEXTURE_2D, textureBuffer.texture)
}
