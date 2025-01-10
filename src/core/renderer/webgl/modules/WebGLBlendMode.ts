export enum WebGLBlendMode {
  NORMAL = 'normal',
  ADD = 'add',
  MULTIPLY = 'multiply',
  SCREEN = 'screen',
  NONE = 'none',
  NORMAL_NPM = 'normal_npm',
  ADD_NPM = 'add_npm',
  SCREEN_NPM = 'screen_npm',
  SRC_IN = 'src_in',
  SRC_OUT = 'src_out',
  SRC_ATOP = 'src_atop',
  DST_OVER = 'dst_over',
  DST_IN = 'dst_in',
  DST_OUT = 'dst_out',
  DST_ATOP = 'dst_atop',
  XOR = 'xor',
  SUBTRACT = 'subtract',
}

export function mapWebGLBlendModes(gl: WebGLRenderingContext): Record<WebGLBlendMode, any> {
  return {
    normal: [gl.ONE, gl.ONE_MINUS_SRC_ALPHA],
    add: [gl.ONE, gl.ONE],
    multiply: [gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA],
    screen: [gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA],
    none: [0, 0],
    // not-premultiplied blend modes
    normal_npm: [gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA],
    add_npm: [gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE],
    screen_npm: [gl.SRC_ALPHA, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA],
    // composite operations
    src_in: [gl.DST_ALPHA, gl.ZERO],
    src_out: [gl.ONE_MINUS_DST_ALPHA, gl.ZERO],
    src_atop: [gl.DST_ALPHA, gl.ONE_MINUS_SRC_ALPHA],
    dst_over: [gl.ONE_MINUS_DST_ALPHA, gl.ONE],
    dst_in: [gl.ZERO, gl.SRC_ALPHA],
    dst_out: [gl.ZERO, gl.ONE_MINUS_SRC_ALPHA],
    dst_atop: [gl.ONE_MINUS_DST_ALPHA, gl.SRC_ALPHA],
    xor: [gl.ONE_MINUS_DST_ALPHA, gl.ONE_MINUS_SRC_ALPHA],
    // SUBTRACT from flash
    subtract: [gl.ONE, gl.ONE, gl.ONE, gl.ONE, gl.FUNC_REVERSE_SUBTRACT, gl.FUNC_ADD],
  }
}
