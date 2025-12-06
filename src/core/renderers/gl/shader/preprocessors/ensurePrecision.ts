import type { GlPrecision } from '../const'

interface EnsurePrecisionOptions {
  requestedVertexPrecision: GlPrecision
  requestedFragmentPrecision: GlPrecision
  maxSupportedVertexPrecision: GlPrecision
  maxSupportedFragmentPrecision: GlPrecision
}

export function ensurePrecision(
  src: string,
  options: EnsurePrecisionOptions,
  isFragment?: boolean,
): string {
  const maxSupportedPrecision = isFragment
    ? options.maxSupportedFragmentPrecision
    : options.maxSupportedVertexPrecision

  if (src.substring(0, 9) !== 'precision') {
    let precision = isFragment
      ? options.requestedFragmentPrecision
      : options.requestedVertexPrecision

    if (precision === 'highp' && maxSupportedPrecision !== 'highp') {
      precision = 'mediump'
    }

    return `precision ${precision} float;\n${src}`
  }
  else if (maxSupportedPrecision !== 'highp' && src.substring(0, 15) === 'precision highp') {
    return src.replace('precision highp', 'precision mediump')
  }

  return src
}
