precision highp float;

in vec2 vUv;
uniform sampler2D uTexture;
uniform vec2 inputSize;
uniform vec2 zoom;
uniform vec2 translate;
uniform float gridScale;
uniform vec2 gridSize;
uniform int checkerboard;
uniform int checkerboardStyle;
// 背景底纹颜色（明暗由主题解析后传入，引擎不再区分 dark 变体）：
//   checkerboardColor    —— 底色（网格底格 / 点阵底）
//   checkerboardDotColor —— 点色（点阵的圆点）
uniform vec3 checkerboardColor;
uniform vec3 checkerboardDotColor;
uniform float dotColorDiff;
uniform int pixelGrid;
uniform int watermark;
uniform sampler2D watermarkTexture;
uniform vec2 watermarkSize;
uniform vec2 watermarkOffset;
uniform vec2 watermarkSpacing;
uniform float watermarkRotation;
uniform float watermarkAlpha;

const float VIEWPORT_SPACE_MIN_DOT_RADIUS = 0.5;
const float CANVAS_SPACE_DOT_RADIUS = 1.;
const float CANVAS_SPACE_DOT_GRID_SIZE_PX = 16.;

// 远距淡出：缩放低于 DOT_FADE_END 起点阵开始渐隐，到 DOT_FADE_START 完全隐藏
// （避免缩得很远时点糊成一片，Figma/FigJam/Miro 同法：点的可见度随 zoom 衰减）。
const float DOT_FADE_START = 0.04;
const float DOT_FADE_END = 0.10;

const int CHECKERBOARD_STYLE_NONE = 0;
const int CHECKERBOARD_STYLE_GRID = 1;
const int CHECKERBOARD_STYLE_DOTS = 2;

float _round(float val) {
  return floor(val + .5);
}

vec2 _round(vec2 pt) {
  return floor(pt + .5);
}

float scaledGridSize(float zoomScale) {
  if (zoomScale < 0.03125) {
    return 32.0 * CANVAS_SPACE_DOT_GRID_SIZE_PX;
  }
  else if (zoomScale < 0.0625) {
    return 16.0 * CANVAS_SPACE_DOT_GRID_SIZE_PX;
  }
  else if (zoomScale < 0.125) {
    return 8.0 * CANVAS_SPACE_DOT_GRID_SIZE_PX;
  }
  else if (zoomScale < 0.25) {
    return 4.0 * CANVAS_SPACE_DOT_GRID_SIZE_PX;
  }
  else if (zoomScale < 0.5) {
    return 2.0 * CANVAS_SPACE_DOT_GRID_SIZE_PX;
  }
  else {
    return CANVAS_SPACE_DOT_GRID_SIZE_PX;
  }
}

vec4 renderCheckerboard(vec2 coord, vec4 color) {
  vec3 bg;
  if (checkerboardStyle == CHECKERBOARD_STYLE_GRID) {
    // 棋盘：两格用底色与其轻微压暗，保持细腻网格感（明暗全由 checkerboardColor 决定）。
    vec2 fractValue = fract(coord * vec2(gridScale) * zoom) - 0.5;
    bg = fractValue.x * fractValue.y < 0.0 ? checkerboardColor : checkerboardColor * 0.96;
  }
  else if (checkerboardStyle == CHECKERBOARD_STYLE_DOTS) {
    // 点阵：底色 checkerboardColor + 圆点 checkerboardDotColor（放大时按 dotColorDiff 提亮）。
    float zoomScale = zoom.x;
    float gridPixelSize = scaledGridSize(zoomScale);
    float zoomInterpolationFactor = smoothstep(0.5, 1.0, zoomScale);
    vec3 dotColor = checkerboardDotColor + vec3(dotColorDiff * zoomInterpolationFactor);
    vec2 nearestGridPoint = _round(coord / gridPixelSize) * gridPixelSize;
    float canvasSpaceDist = length(coord - nearestGridPoint);
    float viewportSpaceDist = canvasSpaceDist * zoomScale;
    float viewportSpaceDotRadius = max(VIEWPORT_SPACE_MIN_DOT_RADIUS, CANVAS_SPACE_DOT_RADIUS * zoomScale);
    float dist = 1.0 - smoothstep(0., 1., (viewportSpaceDist - viewportSpaceDotRadius + .5));
    // 远距淡出：zoomScale 越低点越淡，低于 DOT_FADE_START 完全隐去（回落到纯底色）。
    dist *= smoothstep(DOT_FADE_START, DOT_FADE_END, zoomScale);
    bg = mix(checkerboardColor, dotColor, dist);
  }
  else {
    bg = checkerboardColor;
  }
  return vec4(bg * (1.0 - color.a) + color.rgb, 1);
}

vec4 renderPixelGrid(vec2 coord, vec4 color) {
  vec3 rgb = color.rgb;
  vec2 corner = fract(coord);
  float gridWeight = max(float(corner.x < gridSize.x), float(corner.y < gridSize.y));
  vec3 gridColor;
  vec3 weights = vec3(0.299, 0.587, 0.114);
  float c2 = dot(rgb * rgb, weights);
  float luminance = sqrt(c2);
  if (luminance > 0.5) {
    float target = (luminance - 0.05) / luminance;
    gridColor = rgb * target;
  }
  else {
    float target = luminance * 0.8 + 0.15;
    float c1 = dot(rgb, weights);
    float a = 1.0 - 2.0 * c1 + c2;
    float b = c2 - c1;
    gridColor = mix(rgb, vec3(1), (b + sqrt(b * b - a * (c2 - target * target))) / a);
  }
  return vec4(mix(rgb, gridColor, gridWeight), color.a);
}

vec4 renderWatermark(vec2 coord, vec4 color) {
  float hw = watermarkSize.x * 0.5;
  float hh = watermarkSize.y * 0.5;
  float c = cos(-watermarkRotation);
  float s = sin(-watermarkRotation);
  vec2 blockSize = watermarkSize + watermarkSpacing;
  vec2 tiles = max(floor(inputSize / blockSize), vec2(1.0));
  vec2 gridCoverage = tiles * blockSize;
  vec2 startPos = watermarkOffset;
  vec2 localPix = coord - startPos;
  vec2 blockIndex = floor(localPix / blockSize);
  vec2 wmCenter = startPos + blockIndex * blockSize + watermarkSize * 0.5 + watermarkSpacing / 2.0;
  vec2 local = coord - wmCenter;
  vec2 inv = vec2(
    local.x * c + local.y * s,
    -local.x * s + local.y * c
  );
  if (inv.x >= -hw && inv.x <= hw && inv.y >= -hh && inv.y <= hh) {
    vec2 wmUV = (inv + vec2(hw, hh)) / watermarkSize;
    vec4 wmColor = texture(watermarkTexture, wmUV);
    float alpha = wmColor.a * watermarkAlpha;
    return mix(color, wmColor, alpha);
  } else {
    return color;
  }
}

void main(void) {
  vec4 color = texture(uTexture, vUv);
  vec2 coord = vec2(vUv.x, 1.0 - vUv.y);
  coord = (coord * inputSize - translate) / zoom;
  if (checkerboard > 0) {
    color = renderCheckerboard(coord, color);
  }
  if (watermark > 0) {
    color = renderWatermark(coord, color);
  }
  if (pixelGrid > 0) {
    color = renderPixelGrid(coord, color);
  }
  gl_FragColor = color;
}
