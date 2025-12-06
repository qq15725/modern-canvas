export enum GlBlendMode {
  normal = 'normal',
  add = 'add',
  multiply = 'multiply',
  screen = 'screen',
  none = 'none',
  normalNpm = 'normalNpm',
  addNpm = 'add_npm',
  screenNpm = 'screenNpm',
  srcIn = 'srcIn',
  srcOut = 'srcOut',
  srcAtop = 'srcAtop',
  dstOver = 'dstOver',
  dstIn = 'dstIn',
  dstOut = 'dstOut',
  dstAtop = 'dstAtop',
  xor = 'xor',
  subtract = 'subtract',
}

export function mapGlBlendModes(gl: WebGLRenderingContext): Record<GlBlendMode, any> {
  return {
    normal: [gl.ONE, gl.ONE_MINUS_SRC_ALPHA],
    add: [gl.ONE, gl.ONE],
    multiply: [gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA],
    screen: [gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA],
    none: [0, 0],
    // not-premultiplied blend modes
    normalNpm: [gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA],
    add_npm: [gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE],
    screenNpm: [gl.SRC_ALPHA, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA],
    // composite operations
    srcIn: [gl.DST_ALPHA, gl.ZERO],
    srcOut: [gl.ONE_MINUS_DST_ALPHA, gl.ZERO],
    srcAtop: [gl.DST_ALPHA, gl.ONE_MINUS_SRC_ALPHA],
    dstOver: [gl.ONE_MINUS_DST_ALPHA, gl.ONE],
    dstIn: [gl.ZERO, gl.SRC_ALPHA],
    dstOut: [gl.ZERO, gl.ONE_MINUS_SRC_ALPHA],
    dstAtop: [gl.ONE_MINUS_DST_ALPHA, gl.SRC_ALPHA],
    xor: [gl.ONE_MINUS_DST_ALPHA, gl.ONE_MINUS_SRC_ALPHA],
    // SUBTRACT from flash
    subtract: [gl.ONE, gl.ONE, gl.ONE, gl.ONE, gl.FUNC_REVERSE_SUBTRACT, gl.FUNC_ADD],
  }
}
