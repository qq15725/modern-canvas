import type { WebGLProgramMeta, WebGLProgramOptions } from '../types'
import type { WebGLRenderer } from '../WebGLRenderer'
import { RawWeakMap } from '../../../shared'
import { WebGLModule } from './WebGLModule'

export class WebGLProgramModule extends WebGLModule {
  override install(renderer: WebGLRenderer): void {
    super.install(renderer)
    renderer.program = this
  }

  boundProgram: WebGLProgram | null = null

  uniforms: Record<string, any> = {
    projectionMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  }

  create(options?: WebGLProgramOptions): WebGLProgram {
    const program = this.gl.createProgram()

    if (!program) {
      throw new Error('Unable to create program')
    }

    if (options) {
      this.update(program, options)
    }

    return program
  }

  getMeta(program: WebGLProgram): WebGLProgramMeta {
    return this._renderer.getRelated(program, () => {
      return {
        attributes: new Map(),
        uniforms: new Map(),
        boundUniforms: new RawWeakMap(),
      }
    })
  }

  update(options: WebGLProgramOptions): void
  update(program: WebGLProgram, options: WebGLProgramOptions): void
  update(...args: any[]): void {
    if (args.length > 1) {
      const oldValue = this.boundProgram
      this.boundProgram = args[0]
      this.update(args[1])
      this.boundProgram = oldValue
      return
    }

    const options = args[0] as WebGLProgramOptions
    const program = this.boundProgram

    if (!program)
      return

    const gl = this.gl
    const meta = this.getMeta(program)

    const vert = this.createShader(options.vert, 'vertex_shader')
    const frag = this.createShader(options.frag, 'fragment_shader')

    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    gl.deleteShader(vert)
    gl.deleteShader(frag)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Unable to link program: ${gl.getProgramInfoLog(program)}`)
    }

    meta.attributes.clear()
    meta.uniforms.clear()

    for (
      let len = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES), i = 0;
      i < len;
      i++
    ) {
      const attrib = gl.getActiveAttrib(program, i)

      if (!attrib || attrib.name.startsWith('gl_'))
        continue

      const type = this._renderer.bindPoints.get(attrib.type) ?? String(attrib.type) as any

      meta.attributes.set(attrib.name, {
        type,
        name: attrib.name,
        size: getVarTypeSize(type),
        location: gl.getAttribLocation(program, attrib.name),
      })
    }

    for (
      let len = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS), i = 0;
      i < len;
      i++
    ) {
      const uniform = gl.getActiveUniform(program, i)

      if (!uniform)
        continue

      const name = uniform.name.replace(/\[.*?\]$/, '')

      let location = gl.getUniformLocation(program, name)
      if (!location) {
        location = gl.getUniformLocation(program, uniform.name)
      }

      meta.uniforms.set(name, {
        name,
        index: i,
        type: this._renderer.bindPoints.get(uniform.type) ?? String(uniform.type) as any,
        size: uniform.size,
        isArray: name !== uniform.name,
        location,
      })
    }
  }

  bind(program: WebGLProgram | null): void {
    const gl = this.gl

    // changed
    const oldValue = this.boundProgram
    const changed = {
      value: oldValue !== program,
    }

    // use program
    if (changed.value) {
      gl.useProgram(program)
      this.boundProgram = program
    }
  }

  createShader(source: string, type: 'vertex_shader' | 'fragment_shader'): WebGLShader {
    const gl = this.gl
    const shader = gl.createShader(this._renderer.getBindPoint(type))

    if (!shader) {
      throw new Error('Unable to create shader')
    }

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Unable to compiling shader :\n${source}\n${gl.getShaderInfoLog(shader)}`)
    }

    return shader
  }

  updateUniforms(program: WebGLProgram, uniforms: Record<string, any>): void
  updateUniforms(uniforms: Record<string, any>): void
  updateUniforms(...args: any[]): void {
    if (args.length > 1) {
      this.bind(args[0])
      this.updateUniforms(args[1])
      return
    }

    const program = this.boundProgram
    if (!program)
      return

    const gl = this.gl
    const uniforms = args[0]

    const {
      uniforms: uniformsInfo,
      boundUniforms,
    } = this.getMeta(program)

    for (const key in uniforms) {
      const value = uniforms[key]
      const info = uniformsInfo.get(key)
      if (!info)
        continue
      const { type, isArray, location } = info
      if (!location)
        continue
      const oldValue = boundUniforms.get(location)
      if (oldValue === value)
        continue
      boundUniforms.set(location, value)

      switch (type) {
        case 'float':
          if (isArray) {
            gl.uniform1fv(location, value)
          }
          else {
            gl.uniform1f(location, value)
          }
          break
        case 'unsigned_int':
          if (isArray) {
            (gl as WebGL2RenderingContext).uniform1uiv(location, value)
          }
          else {
            (gl as WebGL2RenderingContext).uniform1ui(location, value)
          }
          break
        case 'bool':
        case 'int':
        case 'sampler_2d':
        case 'sampler_cube':
        case 'sampler_2d_array':
          if (isArray) {
            gl.uniform1iv(location, value)
          }
          else {
            gl.uniform1i(location, value)
          }
          break
        case 'bool_vec2':
        case 'int_vec2':
          gl.uniform2iv(location, value)
          break
        case 'unsigned_int_vec2':
          (gl as WebGL2RenderingContext).uniform2uiv(location, value)
          break
        case 'float_vec2':
          gl.uniform2fv(location, value)
          break
        case 'bool_vec3':
        case 'int_vec3':
          gl.uniform3iv(location, value)
          break
        case 'unsigned_int_vec3':
          (gl as WebGL2RenderingContext).uniform3uiv(location, value)
          break
        case 'float_vec3':
          gl.uniform3fv(location, value)
          break
        case 'bool_vec4':
        case 'int_vec4':
          gl.uniform4iv(location, value)
          break
        case 'unsigned_int_vec4':
          (gl as WebGL2RenderingContext).uniform4uiv(location, value)
          break
        case 'float_vec4':
          gl.uniform4fv(location, value)
          break
        case 'float_mat2':
          gl.uniformMatrix2fv(location, false, value)
          break
        case 'float_mat3':
          gl.uniformMatrix3fv(location, false, value)
          break
        case 'float_mat4':
          gl.uniformMatrix4fv(location, false, value)
          break
      }
    }
  }

  override reset(): void {
    super.reset()
    this.boundProgram = null
    this.uniforms = {}
  }

  free(): void {
    super.free()
    this.bind(null)
  }
}

function getVarTypeSize(type: string): number {
  switch (type) {
    case 'float':
    case 'int':
    case 'unsigned_int':
    case 'bool':
    case 'sampler_2d':
      return 1
    case 'float_vec2':
    case 'int_vec2':
    case 'unsigned_int_vec2':
    case 'bool_vec2':
      return 2
    case 'float_vec3':
    case 'int_vec3':
    case 'unsigned_int_vec3':
    case 'bool_vec3':
      return 3
    case 'float_vec4':
    case 'int_vec4':
    case 'unsigned_int_vec4':
    case 'bool_vec4':
    case 'float_mat2':
      return 4
    case 'float_mat3':
      return 9
    case 'float_mat4':
      return 16
    default:
      return 1
  }
}
