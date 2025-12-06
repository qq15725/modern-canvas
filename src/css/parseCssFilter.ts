import { ColorMatrix, parseCssFunctions, PI_2 } from '../core'

export type CSSFilterKey
  = | 'hue-rotate'
    | 'saturate'
    | 'brightness'
    | 'contrast'
    | 'invert'
    | 'sepia'
    | 'opacity'
    | 'grayscale'

export type CSSFilters = Record<CSSFilterKey, number>

const defaultFilters: CSSFilters = {
  'brightness': 1,
  'contrast': 1,
  'grayscale': 0,
  'hue-rotate': 0,
  'invert': 0,
  'opacity': 1,
  'saturate': 1,
  'sepia': 0,
}

export function parseCssFilter(filter: string): ColorMatrix {
  const m = new ColorMatrix()

  if (filter === 'none') {
    return m
  }

  const filters: CSSFilters = parseCssFunctions(filter)
    .reduce((filter, { name, args }) => {
      (filter as any)[name] = args[0].normalizedIntValue
      return filter
    }, {} as CSSFilters)

  Object.keys(defaultFilters).forEach((name) => {
    (filters as any)[name] = (filters as any)[name] ?? (defaultFilters as any)[name]
  })

  for (const name in filters) {
    const value = (filters as any)[name]
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
