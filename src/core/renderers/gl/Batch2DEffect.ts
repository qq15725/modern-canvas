/**
 * 合批 shader 的效果插槽：每个效果是一个独立模块，声明自己的 GLSL 片段与
 * uniform，编译时组装进共享 uber-shader —— 特性代码不再散落在核心模板里，
 * 新增同类效果（虚线 / 渐变描边 / 选中脉冲…）只需注册一个新效果对象。
 *
 * 核心向片段提供的通用通道：
 * - `vec4 color`（可读写，预乘 alpha）
 * - `vec2 vUv`（纯色描边下 u = 路径像素弧长、v = 横向 0..1，见 CanvasContext）
 * - `float vFlags`（aTextureParams.y 字节：bit0 = clipOutsideUv 为核心保留，
 *   bit1+ 归效果使用，由 {@link Batchable2D.effectFlags} 写入）
 * - `float vParam`（aTextureParams.w 字节：效果自定义标量，
 *   由 {@link Batchable2D.effectParam} 写入，0 = 关闭）
 * - `float uTime`（秒，核心时钟）+ 效果自声明的 uniform
 *   （宿主经 `batch2D.effectUniforms` 覆盖默认值）
 *
 * 运行成本：标志/参数是 per-primitive 常量，warp 内分支不发散，未启用的
 * 元素只付几条标量比较。
 */
export interface Batch2DEffect {
  /** 唯一名；重复注册按名替换。 */
  name: string
  /** ES300 片段，注入 main() 内（clip 之后、输出之前）。 */
  fragment?: string
  /** ES100（WebGL1，无导数函数）降级片段；缺省则该效果在 GL1 下关闭。 */
  fragmentGl1?: string
  /** 片段所需的 uniform 声明，如 `uniform vec3 uFlowColor;`。 */
  uniformDecls?: string
  /** uniform 默认值；宿主可经 `batch2D.effectUniforms` 逐帧覆盖。 */
  uniformDefaults?: Record<string, any>
}

/** aTextureParams.y bit0：UV 越界裁剪（核心语义，效果位从 bit1 起）。 */
export const FLAG_CLIP_OUTSIDE_UV = 1
/** aTextureParams.y bit1：描边羽化 + hairline（需要横向 v UV）。 */
export const FLAG_STROKE_AA = 2

/** 流动速度（周期/秒，符号=方向）→ 参数字节：128=0 速，1 单位=1/32 周期/s，0=关。 */
export function encodeFlowSpeed(speed: number): number {
  return Math.min(255, Math.max(1, Math.round(speed * 32) + 128))
}

/**
 * 描边羽化 + 亚像素 hairline 补偿。1/fwidth(v) 即描边屏幕像素宽度：边缘做
 * ~1px alpha 渐变；宽度不足 1px 时按覆盖率降 alpha（能量守恒），细线不再
 * 碎成点刻。流动描边自带 core AA，编码侧不会同时置此位。
 */
export const strokeFeatherEffect: Batch2DEffect = {
  name: 'strokeFeather',
  fragment: `if (mod(floor(vFlags * 0.5), 2.0) > 0.5) {
    float w = 1.0 / max(fwidth(vUv.y), 1e-6);
    float d = min(vUv.y, 1.0 - vUv.y) * w;
    color *= clamp(d + 0.5, 0.0, 1.0) * clamp(w, 0.0, 1.0);
  }`,
}

/**
 * 描边流动亮段（vParam = encodeFlowSpeed 编码的速度）：u 为路径像素弧长，
 * 亮段间距 uFlowPeriod 路径像素（固定物理长度，长短线亮段一致），每段
 * 前缘快收 + 短拖尾（~22% 周期）。宿主把几何加宽（widthBoost）后，可见
 * 线体只画在中间 50%，外圈是亮段经过时点亮的辉光带——零额外 pass 的 bloom。
 */
export const flowStreakEffect: Batch2DEffect = {
  name: 'flowStreak',
  uniformDecls: `uniform vec3 uFlowColor;
uniform float uFlowPeriod;`,
  uniformDefaults: {
    uFlowColor: new Float32Array([0.231, 0.51, 0.965]),
    uFlowPeriod: 800,
  },
  fragment: `if (vParam > 0.5) {
    float speed = (vParam - 128.0) / 32.0;
    float b = fract((uTime * speed - vUv.x / uFlowPeriod) * (speed < 0.0 ? -1.0 : 1.0));
    float s = b > 0.5 ? b - 1.0 : b;
    float streak = smoothstep(-0.045, -0.01, s) * (1.0 - smoothstep(0.02, 0.18, s));

    float w = 1.0 / max(fwidth(vUv.y), 1e-6);
    float px = abs(vUv.y - 0.5) * w;
    float corePx = w * 0.25;
    float core = clamp(corePx - px + 0.5, 0.0, 1.0);
    float halo = 1.0 - smoothstep(corePx, w * 0.5, px);

    vec4 line = color * core;
    line.rgb = mix(line.rgb, uFlowColor * line.a, streak);
    float glowA = streak * halo * (1.0 - core) * 0.55 * color.a;
    color = line + vec4(uFlowColor * glowA, glowA);
  }`,
  // WebGL1 无导数：整宽染色，无辉光（宿主也不应加宽几何）
  fragmentGl1: `if (vParam > 0.5) {
    float speed = (vParam - 128.0) / 32.0;
    float b = fract((uTime * speed - vUv.x / uFlowPeriod) * (speed < 0.0 ? -1.0 : 1.0));
    float s = b > 0.5 ? b - 1.0 : b;
    float streak = smoothstep(-0.045, -0.01, s) * (1.0 - smoothstep(0.02, 0.18, s));
    color.rgb = mix(color.rgb, uFlowColor * color.a, streak);
  }`,
}
