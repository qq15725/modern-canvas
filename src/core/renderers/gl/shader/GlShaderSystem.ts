import type { ShaderLike } from '../../shared'
import type { WebGLRenderer } from '../WebGLRenderer'
import type { GlAttribute, GlProgram, GlUniform } from './GlProgram'
import { getAttributeInfoFromFormat } from '../../shared/geometry/getAttributeInfoFromFormat'
import { UniformGroup } from '../../shared/shader'
import { GlSystem } from '../system'
import { defaultValue } from './defaultValue'
import { GlProgramData } from './GlProgramData'
import { mapGlToVertexFormat, mapType } from './mapType'

export class GlShaderSystem extends GlSystem {
  override install(renderer: WebGLRenderer): void {
    super.install(renderer)
    renderer.shader = this
  }

  readonly glProgramDatas = new Map<number, GlProgramData>()
  currentProgram: GlProgram | null = null

  /**
   * Global uniforms (projection/view) shared by every shader. Held as a
   * UniformGroup so each program only re-uploads them when they actually change
   * (tracked via the group's `_dirtyId`). Call {@link markGlobalUniformsDirty}
   * after mutating `uniforms.projectionMatrix` / `uniforms.viewMatrix`.
   */
  readonly globalUniforms = new UniformGroup({
    projectionMatrix: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
    viewMatrix: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
  }, { isStatic: true })

  /** Backwards-compatible accessor for the global uniform values. */
  get uniforms(): { projectionMatrix: Float32Array, viewMatrix: Float32Array } {
    return this.globalUniforms.uniforms
  }

  /** Flag the global uniforms as changed so they are re-uploaded on next use. */
  markGlobalUniformsDirty(): void {
    this.globalUniforms.update()
  }

  bind(source: ShaderLike | null): void {
    this.useProgram(source?.glProgram ?? null)
  }

  useProgram(glProgram: GlProgram | null): void {
    const gl = this._gl
    if (this.currentProgram !== glProgram) {
      this.currentProgram = glProgram
      if (glProgram) {
        gl.useProgram(this.getGlProgramData(glProgram).native)
      }
      else {
        gl.useProgram(null)
      }
    }
  }

  getGlProgramData(source: GlProgram): GlProgramData {
    return this.glProgramDatas.get(source.id)
      || this._createGlProgramData(source)
  }

  protected _createGlProgramData(glProgram: GlProgram): GlProgramData {
    const gl = this._gl
    const glProgramData = new GlProgramData(gl.createProgram())
    this.glProgramDatas.set(glProgram.id, glProgramData)

    this.useProgram(glProgram)
    const vertex = this._createGlShader(glProgram.vertex, gl.VERTEX_SHADER)
    const fragment = this._createGlShader(glProgram.fragment, gl.FRAGMENT_SHADER)
    gl.attachShader(glProgramData.native, vertex)
    gl.attachShader(glProgramData.native, fragment)
    gl.linkProgram(glProgramData.native)

    if (!gl.getProgramParameter(glProgramData.native, gl.LINK_STATUS)) {
      throw new Error(`Failed to link program: ${gl.getProgramInfoLog(glProgramData.native)}`)
    }

    const attributes: Record<string, GlAttribute> = Object.create(null)
    const sortAttributes = !(/^[ \t]*#[ \t]*version[ \t]+300[ \t]+es[ \t]*$/m).test(glProgram.vertex)
    for (
      let len = gl.getProgramParameter(glProgramData.native, gl.ACTIVE_ATTRIBUTES), i = 0;
      i < len;
      i++
    ) {
      const attrib = gl.getActiveAttrib(glProgramData.native, i)
      if (!attrib || attrib.name.startsWith('gl_'))
        continue
      const format = mapGlToVertexFormat(gl, attrib.type)
      attributes[attrib.name] = {
        location: 0,
        format,
        stride: getAttributeInfoFromFormat(format).stride,
        offset: 0,
        instance: false,
        start: 0,
      }
    }
    const keys = Object.keys(attributes)
    if (sortAttributes) {
      keys.sort((a, b) => (a > b) ? 1 : -1)
      for (let i = 0; i < keys.length; i++) {
        attributes[keys[i]].location = i
        gl.bindAttribLocation(glProgramData.native, i, keys[i])
      }
      gl.linkProgram(glProgramData.native)
    }
    else {
      for (let i = 0; i < keys.length; i++) {
        attributes[keys[i]].location = gl.getAttribLocation(glProgramData.native, keys[i])
      }
    }
    glProgram.attributes = attributes

    const uniforms: Record<string, GlUniform> = Object.create(null)
    for (
      let len = gl.getProgramParameter(glProgramData.native, gl.ACTIVE_UNIFORMS), i = 0;
      i < len;
      i++
    ) {
      const uniform = gl.getActiveUniform(glProgramData.native, i)
      if (!uniform)
        continue
      const name = uniform.name.replace(/\[.*?\]$/, '')
      const type = mapType(gl, uniform.type)
      const size = uniform.size
      uniforms[name] = {
        name,
        index: i,
        type,
        size,
        isArray: !!(uniform.name.match(/\[.*?\]$/)),
        value: defaultValue(type, size),
      }
    }
    glProgram.uniforms = uniforms
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    return glProgramData
  }

  protected _createGlShader(source: string, target: number): WebGLShader {
    const gl = this._gl
    const shader = gl.createShader(target)
    if (!shader) {
      throw new Error('Failed to create shader')
    }
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`Failed to compiling shader :\n${source}\n${gl.getShaderInfoLog(shader)}`)
    }
    return shader
  }

  updateUniforms(source: ShaderLike): void {
    this.bind(source)
    const { glProgram, uniforms = {} } = source
    this._uploadUniforms(glProgram, this.getGlProgramData(glProgram), uniforms)
  }

  /**
   * Upload a shared uniform group to a program, skipping the work entirely when
   * the group has not changed since it was last synced to this program.
   */
  updateUniformGroup(group: UniformGroup, glProgram: GlProgram): void {
    const glProgramData = this.getGlProgramData(glProgram)
    if (group.isStatic && glProgramData.uniformDirtyGroups[group.uid] === group._dirtyId) {
      return
    }
    glProgramData.uniformDirtyGroups[group.uid] = group._dirtyId
    this.useProgram(glProgram)
    this._uploadUniforms(glProgram, glProgramData, group.uniforms)
  }

  protected _uploadUniforms(
    glProgram: GlProgram,
    glProgramData: GlProgramData,
    uniforms: Record<string, any>,
  ): void {
    const gl = this._gl
    const {
      uniforms: boundUniforms,
    } = glProgram

    for (const key in uniforms) {
      const value = uniforms[key]

      const boundUniform = boundUniforms[key]
      if (!boundUniform)
        continue

      const { type, isArray, name } = boundUniform

      // cache the location: getUniformLocation is comparatively expensive and the
      // location is stable for the lifetime of the linked program
      if (boundUniform.location === undefined) {
        boundUniform.location = gl.getUniformLocation(glProgramData.native, name)
      }
      const location = boundUniform.location

      // Skip the GPU call when the value is unchanged. Values are frequently the
      // same array mutated in place, so a reference compare is useless — instead
      // compare component-wise against an independent shadow copy held in
      // boundUniform.value (which mirrors what is currently uploaded to the program).
      if (!uniformValueChanged(boundUniform.value, value)) {
        continue
      }
      boundUniform.value = writeUniformShadow(boundUniform.value, value)

      switch (type) {
        case 'float':
          if (isArray) {
            gl.uniform1fv(location, value)
          }
          else {
            gl.uniform1f(location, value)
          }
          break
        case 'uint':
          if (isArray) {
            (gl as WebGL2RenderingContext).uniform1uiv(location, value)
          }
          else {
            (gl as WebGL2RenderingContext).uniform1ui(location, value)
          }
          break
        case 'bool':
        case 'int':
        case 'sampler2D':
        case 'samplerCube':
        case 'sampler2DArray':
          if (isArray) {
            gl.uniform1iv(location, value)
          }
          else {
            gl.uniform1i(location, value)
          }
          break
        case 'bvec2':
        case 'ivec2':
          gl.uniform2iv(location, value)
          break
        case 'uvec2':
          (gl as WebGL2RenderingContext).uniform2uiv(location, value)
          break
        case 'vec2':
          gl.uniform2fv(location, value)
          break
        case 'bvec3':
        case 'ivec3':
          gl.uniform3iv(location, value)
          break
        case 'uvec3':
          (gl as WebGL2RenderingContext).uniform3uiv(location, value)
          break
        case 'vec3':
          gl.uniform3fv(location, value)
          break
        case 'bvec4':
        case 'ivec4':
          gl.uniform4iv(location, value)
          break
        case 'uvec4':
          (gl as WebGL2RenderingContext).uniform4uiv(location, value)
          break
        case 'vec4':
          gl.uniform4fv(location, value)
          break
        case 'mat2':
          gl.uniformMatrix2fv(location, false, value)
          break
        case 'mat3':
          gl.uniformMatrix3fv(location, false, value)
          break
        case 'mat4':
          gl.uniformMatrix4fv(location, false, value)
          break
      }
    }
  }

  override reset(): void {
    super.reset()
    if (!this._renderer.contextLost) {
      const gl = this._gl
      this.glProgramDatas.forEach(glProgramData => gl.deleteProgram(glProgramData.native))
    }
    this.glProgramDatas.clear()
    this.currentProgram = null
    this.globalUniforms.uniforms.projectionMatrix = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])
    this.globalUniforms.uniforms.viewMatrix = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1])
    this.markGlobalUniformsDirty()
  }

  destroy(): void {
    super.destroy()
    this.bind(null)
  }
}

/**
 * Returns true if `value` differs from the shadow copy of the last uploaded value.
 * Arrays/typed-arrays are compared component-wise (the same array is often mutated
 * in place, so a reference compare would wrongly report "unchanged").
 */
function uniformValueChanged(shadow: any, value: any): boolean {
  if (value !== null && typeof value === 'object') {
    const len = value.length
    if (shadow === null || typeof shadow !== 'object' || shadow.length !== len) {
      return true
    }
    for (let i = 0; i < len; i++) {
      if (shadow[i] !== value[i]) {
        return true
      }
    }
    return false
  }
  return shadow !== value
}

/**
 * Writes `value` into the shadow copy and returns the shadow to store back.
 * For arrays the existing shadow is mutated in place (so it stays independent of
 * the caller's array); scalars are returned directly.
 */
function writeUniformShadow(shadow: any, value: any): any {
  if (value !== null && typeof value === 'object') {
    const len = value.length
    if (shadow !== null && typeof shadow === 'object' && shadow.length === len) {
      for (let i = 0; i < len; i++) {
        shadow[i] = value[i]
      }
      return shadow
    }
    return value.slice ? value.slice() : Array.prototype.slice.call(value)
  }
  return value
}
