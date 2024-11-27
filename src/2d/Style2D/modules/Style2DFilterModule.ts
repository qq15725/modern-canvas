import type { Style2D } from '../Style2D'
import { ColorMatrix } from '../../../color'
import { defineProperty } from '../../../core'
import { parseCssFunctions, PI_2 } from '../../../shared'
import { Style2DModule } from './Style2DModule'

export interface Style2DFilterProperties {
  filter: string
}

export type Style2DFilterKey =
  | 'hue-rotate'
  | 'saturate'
  | 'brightness'
  | 'contrast'
  | 'invert'
  | 'sepia'
  | 'opacity'
  | 'grayscale'
export type Style2DFilter = Record<Style2DFilterKey, number>

declare module '../Style2D' {
  interface Style2DOptions extends Partial<Style2DFilterProperties> {
    //
  }

  interface Style2D extends Style2DFilterProperties {
    getComputedFilter: typeof getComputedFilter
    getComputedFilterColorMatrix: typeof getComputedFilterColorMatrix
  }
}

export class Style2DFilterModule extends Style2DModule {
  install(Style2D: new () => Style2D): void {
    defineProperty(Style2D, 'filter', { default: '' })
    Style2D.prototype.getComputedFilter = getComputedFilter
    Style2D.prototype.getComputedFilterColorMatrix = getComputedFilterColorMatrix
  }
}

const style2DFilterDefault: Style2DFilter = {
  'brightness': 1,
  'contrast': 1,
  'grayscale': 0,
  'hue-rotate': 0,
  'invert': 0,
  'opacity': 1,
  'saturate': 1,
  'sepia': 0,
}

function getComputedFilter(this: Style2D): Style2DFilter {
  const filter = parseCssFunctions(this.filter).reduce((filter, { name, args }) => {
    (filter as any)[name] = args[0].normalizedIntValue
    return filter
  }, {} as Style2DFilter)

  Object.keys(style2DFilterDefault).forEach((name) => {
    (filter as any)[name] = (filter as any)[name] ?? (style2DFilterDefault as any)[name]
  })

  return filter
}

function getComputedFilterColorMatrix(this: Style2D): ColorMatrix {
  const m = new ColorMatrix()
  const filter = this.getComputedFilter()
  for (const name in filter) {
    const value = (filter as any)[name]
    switch (name) {
      case 'hue-rotate':
        m.hueRotate(value * PI_2)
        break
      case 'saturate':
        m.saturate(value)
        break
      case 'brightness':
        m.brightness(value)
        break
      case 'contrast':
        m.contrast(value)
        break
      case 'invert':
        m.invert(value)
        break
      case 'sepia':
        m.sepia(value)
        break
      case 'opacity':
        m.opacity(value)
        break
      case 'grayscale':
        m.grayscale(value)
        break
    }
  }
  return m
}
