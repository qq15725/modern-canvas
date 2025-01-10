import { Material } from './Material'

// uniform float foo; // = 42.0
// uniform vec2 foo; // = vec2(42.0, 42.0)
// uniform vec2 foo, bar; // = vec2(1.0, 2.0); // both at the same time ! (needs a ';' if you have this second //, like usual glsl code)
// eslint-disable-next-line regexp/no-super-linear-backtracking
const DEFAULT_VALUE_RE = /^uniform \w+ (.+?);\s*\/\/\s*=\s*([^;]+?)[\s;]*$/gm

// TODO
// uniform float foo/* = 42.0 */;
// uniform vec2 foo /*= vec2(42.0, 42.0)*/, bar /* = vec2(1.) */;
// const RE2 = /^uniform \w+ ((\w+?) *?\/\* *= *(.+?) *\*\/)+;$/gm

// vec2(42.0, 42.0)
// vec4(0.,0.,0.,.6)
const VEC_RE = /vec(\d)\((.*)\)/

function parseVal(val: string): number | number[] {
  val = val.trim()
  const matched = val.match(VEC_RE)
  if (matched) {
    const arr = Array.from({ length: Number(matched[1]) }, () => 0)
    matched[2].split(',').forEach((val, i) => {
      arr[i] = Number(val.trim())
    })
    return arr
  }
  return Number(val)
}

export class EffectMaterial extends Material {
  override vert = `attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vUv = uv;
}`

  override readonly uniforms = new Map<string, any>([
    ['ratio', 0],
    ['from', 0],
    ['to', 1],
    ['progress', 0],
  ])

  static RE = {
    getColor: /\sgetColor\s*\(/,
    getFromColor: /\sgetFromColor\s*\(/,
    getToColor: /\sgetToColor\s*\(/,
    transform: /\stransform\s*\(/,
    transition: /\stransition\s*\(/,
  }

  has = {
    getColor: false,
    getFromColor: false,
    getToColor: false,
    transform: false,
    transition: false,
  }

  constructor(glsl: string) {
    super()

    const has = this.has
    for (const key in EffectMaterial.RE) {
      (has as any)[key] = (EffectMaterial.RE as any)[key].test(glsl)
    }

    this.frag = `precision highp float;
varying vec2 vUv;
uniform float ratio;
uniform float progress;
${
  (has.getColor || has.getFromColor || has.getToColor)
    ? '\nuniform sampler2D from;'
    : ''
}${
  (has.getFromColor || has.getToColor)
    ? '\nuniform sampler2D to;'
    : ''
}
${
  has.getColor
    ? '\nvec4 getColor(vec2 uv) { return texture2D(from, uv); }'
    : ''
}${
  (has.getFromColor || has.getToColor)
    ? '\nvec4 getFromColor(vec2 uv) { return texture2D(from, uv); }\nvec4 getToColor(vec2 uv) { return texture2D(to, uv); }'
    : ''
}
${glsl}${
  has.transform
    ? '\nvoid main(void) { gl_FragColor = transform(vUv); }'
    : has.transition
      ? '\nvoid main(void) { gl_FragColor = transition(vUv); }'
      : ''
}`

    const matched = glsl.matchAll(DEFAULT_VALUE_RE)

    for (const item of matched) {
      if (item[1] && item[2]) {
        item[1].split(',').forEach((val) => {
          this.uniforms.set(val.trim(), parseVal(item[2]))
        })
      }
    }
  }
}
