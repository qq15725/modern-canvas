import type { BufferLike, GeometryLike, Topology } from '../../shared'
import type { GlBuffer } from '../buffer'
import type { GlRenderer } from '../GlRenderer'
import type { GlProgram } from '../shader'
import { getAttributeInfoFromFormat } from '../../shared/geometry/getAttributeInfoFromFormat'
import { GlSystem } from '../system'
import { getGlTypeFromFormat } from './getGlTypeFromFormat'

export interface GlDrawOptions {
  topology?: Topology
  size?: number
  start?: number
  instanceCount?: number
}

const topologyToGlMap = {
  'point-list': 0x0000,
  'line-list': 0x0001,
  'line-strip': 0x0003,
  'triangle-list': 0x0004,
  'triangle-strip': 0x0005,
}

export class GlGeometrySystem extends GlSystem {
  protected _geometryVaoHash: Record<number, Record<string, WebGLVertexArrayObject>> = {}

  hasInstance = false
  current: GeometryLike | null = null
  currentVao: WebGLVertexArrayObject | null = null

  override install(renderer: GlRenderer): void {
    super.install(renderer)
    renderer.geometry = this
  }

  bind(geometry: GeometryLike | null, program?: GlProgram): void {
    const gl = this._gl
    this.current = geometry
    if (geometry && program) {
      const vao = this.getVao(geometry, program)
      if (this.currentVao !== vao) {
        this.currentVao = vao
        gl.bindVertexArray(vao)
      }
      this.updateBuffers()
    }
    else {
      this.currentVao = null
      gl.bindVertexArray(null)
    }
  }

  protected getVao(geometry: GeometryLike, program: GlProgram): WebGLVertexArrayObject {
    return this._geometryVaoHash[geometry.instanceId]?.[program.id]
      || this._createVao(geometry, program)
  }

  protected _getBuffers(geometry: GeometryLike): BufferLike[] {
    const { attributes, indexBuffer } = geometry
    const buffers: BufferLike[] = []
    for (const i in geometry.attributes) {
      const attribute = attributes[i]
      if (!buffers.includes(attribute.buffer)) {
        buffers.push(attribute.buffer)
      }
    }
    if (indexBuffer && !buffers.includes(indexBuffer)) {
      buffers.push(indexBuffer)
    }
    return buffers
  }

  protected _ensureAttributes(
    geometry: GeometryLike,
    program: GlProgram,
    buffers: BufferLike[],
  ): void {
    const { attributes = {} } = geometry
    for (const i in attributes) {
      const attribute = attributes[i]
      const attributeData = program.attributes[i]
      if (attributeData) {
        attribute.format ??= attributeData.format
        attribute.offset ??= attributeData.offset
        attribute.instance ??= attributeData.instance
      }
      else {
        console.warn(`Attribute ${i} is not present in the shader, but is present in the geometry. Unable to infer attribute details.`)
      }
    }
    const tempStride: Record<string, number> = {}
    const tempStart: Record<string, number> = {}
    for (const j in buffers) {
      const buffer = buffers[j]
      tempStride[buffer.instanceId] = 0
      tempStart[buffer.instanceId] = 0
    }
    for (const j in attributes) {
      const attribute = attributes[j]
      tempStride[attribute.buffer.instanceId] += getAttributeInfoFromFormat(attribute.format).stride
    }
    for (const j in attributes) {
      const attribute = attributes[j]
      attribute.stride ??= tempStride[attribute.buffer.instanceId]
      attribute.start ??= tempStart[attribute.buffer.instanceId]
      tempStart[attribute.buffer.instanceId] += getAttributeInfoFromFormat(attribute.format).stride
    }
  }

  protected _createVao(
    geometry: GeometryLike,
    program: GlProgram,
  ): WebGLVertexArrayObject {
    const gl = this._gl
    const bufferSystem = this._renderer.buffer
    this._renderer.shader.getGlProgramData(program)
    const signature = this._getSignature(geometry, program)
    if (!this._geometryVaoHash[geometry.instanceId]) {
      this._geometryVaoHash[geometry.instanceId] = Object.create(null)
      if ('on' in geometry) {
        geometry.on('destroy', () => {
          const vaoObjectHash = this._geometryVaoHash[geometry.instanceId]
          if (vaoObjectHash) {
            if (this._renderer.contextLost) {
              for (const i in vaoObjectHash) {
                if (this.currentVao !== vaoObjectHash[i]) {
                  this.unbind()
                }
                gl.deleteVertexArray(vaoObjectHash[i])
              }
            }
            delete this._geometryVaoHash[geometry.instanceId]
          }
        })
      }
    }
    const vaoObjectHash = this._geometryVaoHash[geometry.instanceId]
    let vao = vaoObjectHash[signature]
    if (vao) {
      vaoObjectHash[program.id] = vao
      return vao
    }
    const buffers = this._getBuffers(geometry)
    this._ensureAttributes(geometry, program, buffers)
    vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    buffers.forEach(buffer => bufferSystem.bind(buffer))
    this._activateVao(geometry, program)
    vaoObjectHash[program.id] = vao
    vaoObjectHash[signature] = vao
    gl.bindVertexArray(null)
    return vao
  }

  protected _activateVao(geometry: GeometryLike, glProgram: GlProgram): void {
    const gl = this._gl
    const bufferSystem = this._renderer.buffer
    const attributes = geometry.attributes
    if (geometry.indexBuffer) {
      bufferSystem.bind(geometry.indexBuffer)
    }
    let lastBuffer: GlBuffer | undefined
    for (const j in attributes) {
      const attribute = attributes[j]
      const buffer = attribute.buffer
      const glBuffer = bufferSystem.getGlBuffer(buffer)
      const programAttrib = glProgram.attributes[j]
      if (programAttrib) {
        if (lastBuffer !== glBuffer) {
          bufferSystem.bind(buffer)
          lastBuffer = glBuffer
        }
        const location = programAttrib.location
        gl.enableVertexAttribArray(location)
        const attributeInfo = getAttributeInfoFromFormat(attribute.format)
        const type = getGlTypeFromFormat(attribute.format)
        if (programAttrib.format?.substring(1, 4) === 'int') {
          gl.vertexAttribIPointer(
            location,
            attributeInfo.size,
            type,
            attribute.stride ?? 0,
            attribute.start ?? 0,
          )
        }
        else {
          gl.vertexAttribPointer(
            location,
            attributeInfo.size,
            type,
            attributeInfo.normalized,
            attribute.stride ?? 0,
            attribute.start ?? 0,
          )
        }
        if (attribute.instance) {
          if (this.hasInstance) {
            const divisor = attribute.divisor ?? 1
            gl.vertexAttribDivisor(location, divisor)
          }
          else {
            throw new Error('geometry error, GPU Instancing is not supported on this device')
          }
        }
      }
    }
  }

  updateBuffers(): void {
    if (this.current) {
      const bufferSystem = this._renderer.buffer
      this._getBuffers(this.current).forEach(buffer => bufferSystem.update(buffer))
    }
  }

  protected _getSignature(geometry: GeometryLike, program: GlProgram): string {
    const attribs = geometry.attributes
    const shaderAttributes = program.attributes
    const strings = ['g', geometry.instanceId]
    for (const i in attribs) {
      if (shaderAttributes[i]) {
        strings.push(i, shaderAttributes[i].location)
      }
    }
    return strings.join('-')
  }

  unbind(): void {
    return this.bind(null)
  }

  getSize(geometry: GeometryLike): number {
    // eslint-disable-next-line no-unreachable-loop
    for (const i in geometry.attributes) {
      const attribute = geometry.attributes[i]
      return attribute.buffer.data.length / ((attribute.stride ?? 0) / 4)
    }
    return 0
  }

  draw(options: GlDrawOptions = {}): this {
    let {
      topology,
      size,
      start = 0,
      instanceCount,
    } = options

    const { gl } = this._renderer

    const geometry = this.current

    if (!geometry) {
      return this
    }

    topology = topology || geometry.topology || 'triangle-list'
    const glTopology = topologyToGlMap[topology]
    instanceCount = instanceCount || geometry.instanceCount || 1
    if (geometry.indexBuffer) {
      size = size || geometry.indexBuffer.data.length
      const byteSize = geometry.indexBuffer.data.BYTES_PER_ELEMENT
      const glType = byteSize === 2 ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT
      if (instanceCount !== 1) {
        gl.drawElementsInstanced(glTopology, size, glType, start * byteSize, instanceCount)
      }
      else {
        gl.drawElements(glTopology, size, glType, start * byteSize)
      }
    }
    else if (instanceCount !== 1) {
      gl.drawArraysInstanced(glTopology, start, size || this.getSize(geometry), instanceCount)
    }
    else {
      gl.drawArrays(glTopology, start, size || this.getSize(geometry))
    }

    return this
  }

  override reset(): void {
    super.reset()
    this.current = null
    this.currentVao = null
  }
}
