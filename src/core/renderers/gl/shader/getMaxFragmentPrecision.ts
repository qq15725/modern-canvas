import type { GlPrecision } from './const'

let maxFragmentPrecision: GlPrecision

/** @internal */
export function getMaxFragmentPrecision(): GlPrecision {
  if (!maxFragmentPrecision) {
    maxFragmentPrecision = 'mediump'
    // const gl = getTestContext()
    // if (gl) {
    //   if (gl.getShaderPrecisionFormat) {
    //     const shaderFragment = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)
    //     if (shaderFragment) {
    //       maxFragmentPrecision = shaderFragment.precision ? 'highp' : 'mediump'
    //     }
    //   }
    // }
  }
  return maxFragmentPrecision
}
