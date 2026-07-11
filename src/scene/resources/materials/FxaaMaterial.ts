import { Material } from './Material'

/**
 * FXAA 后处理材质：在「root FBO → 画布」的最终合成 draw 里顺带完成抗锯齿，
 * 不新增渲染 pass、不占额外显存（对比 MSAA 的 4x multisample renderbuffer）。
 *
 * 实现为紧凑版 FXAA 3.11（5 次亮度探测 + 沿边缘方向 4 次采样混合）：
 * - 颜色在预乘 alpha 空间整体（rgba 一起）混合，保持预乘一致性；
 * - 亮度加入小比例 alpha 项，暗色内容叠在透明背景上时边缘仍可被检出
 *   （纯预乘 rgb 的黑色与透明像素亮度同为 0，会漏检）；
 * - 平坦区域按对比度阈值早退、原样输出，避免文字/纹理内部被无谓软化。
 */
export class FxaaMaterial extends Material {
  protected static _instance: FxaaMaterial
  static get instance(): FxaaMaterial { return this._instance ??= new this() }

  constructor() {
    super({
      gl: {
        vertex: `in vec2 position;
in vec2 uv;
uniform mat3 projectionMatrix;
uniform mat3 modelViewMatrix;
out vec2 vUv;
void main(void) {
  gl_Position = vec4((projectionMatrix * modelViewMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
  vUv = uv;
}`,
        fragment: `in vec2 vUv;
uniform sampler2D sampler;
uniform vec2 texelSize;

#define FXAA_REDUCE_MIN (1.0 / 128.0)
#define FXAA_REDUCE_MUL (1.0 / 8.0)
#define FXAA_SPAN_MAX 8.0

float fxaaLuma(vec4 c) {
  return dot(c.rgb, vec3(0.299, 0.587, 0.114)) + c.a * 0.1;
}

void main(void) {
  vec4 rgbaM = texture(sampler, vUv);
  float lumaM = fxaaLuma(rgbaM);
  float lumaNW = fxaaLuma(texture(sampler, vUv + vec2(-1.0, -1.0) * texelSize));
  float lumaNE = fxaaLuma(texture(sampler, vUv + vec2(1.0, -1.0) * texelSize));
  float lumaSW = fxaaLuma(texture(sampler, vUv + vec2(-1.0, 1.0) * texelSize));
  float lumaSE = fxaaLuma(texture(sampler, vUv + vec2(1.0, 1.0) * texelSize));

  float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
  float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

  if (lumaMax - lumaMin < max(0.0312, lumaMax * 0.125)) {
    finalColor = rgbaM;
    return;
  }

  vec2 dir = vec2(
    -((lumaNW + lumaNE) - (lumaSW + lumaSE)),
    ((lumaNW + lumaSW) - (lumaNE + lumaSE))
  );

  float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * 0.25 * FXAA_REDUCE_MUL, FXAA_REDUCE_MIN);
  float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
  dir = clamp(dir * rcpDirMin, vec2(-FXAA_SPAN_MAX), vec2(FXAA_SPAN_MAX)) * texelSize;

  vec4 rgbaA = 0.5 * (
    texture(sampler, vUv + dir * (1.0 / 3.0 - 0.5))
    + texture(sampler, vUv + dir * (2.0 / 3.0 - 0.5))
  );
  vec4 rgbaB = rgbaA * 0.5 + 0.25 * (
    texture(sampler, vUv + dir * -0.5)
    + texture(sampler, vUv + dir * 0.5)
  );

  float lumaB = fxaaLuma(rgbaB);
  finalColor = (lumaB < lumaMin || lumaB > lumaMax) ? rgbaA : rgbaB;
}`,
      },
      uniforms: {
        sampler: 0,
        texelSize: new Float32Array([0, 0]),
        projectionMatrix: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
        modelViewMatrix: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
      },
    })
  }
}
