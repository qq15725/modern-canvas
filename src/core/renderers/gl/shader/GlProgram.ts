import type { GeometryAttributeLike } from '../../shared'
import { createIdFromString } from '../../shared'
import { getMaxFragmentPrecision } from './getMaxFragmentPrecision'
import { addProgramDefines } from './preprocessors/addProgramDefines'
import { ensurePrecision } from './preprocessors/ensurePrecision'
import { insertVersion } from './preprocessors/insertVersion'
import { setProgramName } from './preprocessors/setProgramName'
import { stripVersion } from './preprocessors/stripVersion'

export interface GlAttribute extends Omit<GeometryAttributeLike, 'buffer'> {
  location: number
}

export interface GlUniform {
  name: string
  index: number
  type: string
  size: number
  isArray: boolean
  value: any
}

const cached: Record<string, GlProgram> = Object.create(null)

const processes: Record<string, ((source: string, options: any, isFragment?: boolean) => string)> = {
  stripVersion,
  ensurePrecision,
  addProgramDefines,
  setProgramName,
  insertVersion,
}

export interface GlProgramOptions {
  fragment: string
  vertex: string
  name?: string
  preferredVertexPrecision?: string
  preferredFragmentPrecision?: string
  transformFeedbackVaryings?: { names: string[], bufferMode: 'separate' | 'interleaved' }
}

export class GlProgram {
  static defaultOptions: Partial<GlProgramOptions> = {
    preferredVertexPrecision: 'highp',
    preferredFragmentPrecision: 'mediump',
  }

  readonly id: number
  fragment: string
  vertex: string
  transformFeedbackVaryings?: { names: string[], bufferMode: 'separate' | 'interleaved' }
  _cacheKey?: string
  attributes: Record<string, GlAttribute> = Object.create(null)
  uniforms: Record<string, GlUniform> = Object.create(null)

  constructor(options: GlProgramOptions) {
    options = { ...GlProgram.defaultOptions, ...options }

    let fragment = options.fragment
    let vertex = options.vertex
    const isES300 = fragment.includes('#version 300 es')
    const preprocessorOptions = {
      stripVersion: isES300,
      ensurePrecision: {
        requestedFragmentPrecision: options.preferredFragmentPrecision,
        requestedVertexPrecision: options.preferredVertexPrecision,
        maxSupportedVertexPrecision: 'highp',
        maxSupportedFragmentPrecision: getMaxFragmentPrecision(),
      },
      setProgramName: {
        name: options.name,
      },
      addProgramDefines: isES300,
      insertVersion: isES300,
    }
    Object.keys(processes).forEach((processKey) => {
      const processOptions = preprocessorOptions[processKey as keyof typeof preprocessorOptions]
      fragment = processes[processKey](fragment, processOptions, true)
      vertex = processes[processKey](vertex, processOptions, false)
    })
    this.fragment = fragment
    this.vertex = vertex
    this.transformFeedbackVaryings = options.transformFeedbackVaryings
    this.id = createIdFromString(`${vertex}:${fragment}`, 'GlProgram')
  }

  destroy(): void {
    this.fragment = ''
    this.vertex = ''
    this.attributes = Object.create(null)
    this.uniforms = Object.create(null)
    this.transformFeedbackVaryings = undefined
    if (this._cacheKey) {
      delete cached[this._cacheKey]
    }
  }

  static from(options: GlProgramOptions): GlProgram {
    const key = `${options.vertex}:${options.fragment}`
    if (!cached[key]) {
      cached[key] = new GlProgram(options)
      cached[key]._cacheKey = key
    }
    return cached[key]
  }
}
