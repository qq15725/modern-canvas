import { fonts } from 'modern-font'
import { getRenderEngine, planExportTiles, render } from '../../src'

// 验证「大图导出」分块逻辑（修复 texImage2D: width or height out of range）。
// 复现 1030×33923 这种超过 MAX_TEXTURE_SIZE 的超长图：
//   - 顶/中/底各有醒目标记，确认拼接后上下顺序正确、无翻转；
//   - 每 2000px 一条带 Y 坐标的横带，确认行块无缝隙/无重叠/无错位；
//   - 左(绿)右(蓝)竖条贯穿全高，确认横向不偏移；
//   - tile 边界(≈16384/32768)处各放一条红线，专门盯接缝。
// 导出后读 gl.getError() 与画布尺寸做断言，并把缩略图贴出来肉眼复核。

const WIDTH = 1030
const HEIGHT = 33923

function band(y: number, h: number, color: string, label: string, text = '#1a1a2e'): any {
  return {
    is: 'Element2D',
    style: {
      left: 0,
      top: y,
      width: WIDTH,
      height: h,
      backgroundColor: color,
      fontSize: Math.min(120, Math.max(40, h * 0.6)),
      color: text,
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    },
    text: label,
  }
}

function line(y: number, color: string): any {
  return {
    is: 'Element2D',
    style: { left: 0, top: y, width: WIDTH, height: 8, backgroundColor: color },
  }
}

function buildChildren(): any[] {
  const children: any[] = []

  // 每 2000px 一条坐标横带（交替底色）+ 左绿右蓝边刻度，用于核对行块位置与横向对齐。
  // 注意：不要用单个全高(20×HEIGHT)元素——单元素超过 MAX_TEXTURE_SIZE 会在元素层自身越界。
  for (let y = 0; y < HEIGHT; y += 2000) {
    children.push(band(y, 80, (y / 2000) % 2 === 0 ? '#dfe6f3' : '#c6d2e8', `y = ${y}`))
    children.push({ is: 'Element2D', style: { left: 0, top: y, width: 20, height: 80, backgroundColor: '#1db954' } })
    children.push({ is: 'Element2D', style: { left: WIDTH - 20, top: y, width: 20, height: 80, backgroundColor: '#2d7ff9' } })
  }

  // tile 边界红线（默认 Chrome MAX_TEXTURE_SIZE 16384）
  children.push(line(16384, '#ff2d55'))
  children.push(line(32768, '#ff2d55'))

  // 顶 / 中 / 底醒目标记
  children.push(band(0, 200, '#ff2d55', 'TOP  ▲  y=0', '#ffffff'))
  children.push(band(Math.floor(HEIGHT / 2) - 100, 200, '#7b2dff', 'MIDDLE  ●', '#ffffff'))
  children.push(band(HEIGHT - 200, 200, '#0a8f4f', 'BOTTOM  ▼  y=end', '#ffffff'))

  return children
}

function report(lines: string[], ok: boolean): void {
  const el = document.createElement('div')
  el.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'padding:12px 16px',
    'font:13px/1.6 monospace', 'white-space:pre-wrap', 'z-index:10',
    `background:${ok ? '#0f3d24' : '#4a0f17'}`, 'color:#e0e0e0',
    'border-bottom:2px solid', `border-color:${ok ? '#1db954' : '#ff2d55'}`,
  ].join(';')
  el.textContent = `${ok ? '✅ PASS' : '❌ FAIL'}\n${lines.join('\n')}`
  document.body.appendChild(el)
}

async function init(): Promise<void> {
  await fonts.loadFallbackFont({ family: 'fallbackFont', src: '/fonts/AaHouDiHei.woff' })

  // 读取本机 GPU 上限，复算 tile 规划（与 Engine._maxExportPassSize 同口径）
  const engine = getRenderEngine()
  const gl = engine.gl as WebGL2RenderingContext
  const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE)
  const maxRenderbuffer = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
  const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array
  const limit = Math.max(1, Math.min(maxTexture, maxRenderbuffer, Math.min(maxViewport[0], maxViewport[1])))
  const tiles = planExportTiles(WIDTH, HEIGHT, limit)

  const t0 = performance.now()
  const canvas = await render({
    width: WIDTH,
    height: HEIGHT,
    data: {
      style: { width: WIDTH, height: HEIGHT, backgroundColor: '#f4f6fb' },
      children: buildChildren(),
    },
  })
  const ms = Math.round(performance.now() - t0)

  // 导出结束后检查 GL 错误状态与画布尺寸
  const glError = engine.gl.getError()
  const sizeOk = canvas.width === WIDTH && canvas.height === HEIGHT
  const ok = glError === 0 && sizeOk

  report([
    `requested      : ${WIDTH} × ${HEIGHT}`,
    `canvas output  : ${canvas.width} × ${canvas.height}  (${sizeOk ? 'match' : 'MISMATCH'})`,
    `MAX_TEXTURE    : ${maxTexture}   MAX_RENDERBUFFER: ${maxRenderbuffer}   MAX_VIEWPORT: ${maxViewport[0]}×${maxViewport[1]}`,
    `tile limit     : ${limit}  →  ${tiles.length} tiles (rows×cols)`,
    `tiles          : ${tiles.map(t => `${t.width}×${t.height}@(${t.x},${t.y})`).join('  ')}`,
    `gl.getError()  : ${glError} (0 = no error)`,
    `export time    : ${ms} ms`,
    `检查缩略图：TOP 在最上、BOTTOM 在最下；红线/横带连续无错位；左绿右蓝竖条贯穿。`,
  ], ok)

  // 缩略图：按宽度缩到 180px，放进可滚动容器肉眼核对全高
  const scaleW = 180
  canvas.style.width = `${scaleW}px`
  canvas.style.height = `${Math.round((HEIGHT / WIDTH) * scaleW)}px`
  canvas.style.imageRendering = 'pixelated'
  canvas.style.display = 'block'
  canvas.style.boxShadow = '0 0 0 1px #000'

  const viewer = document.createElement('div')
  viewer.style.cssText = 'position:fixed;left:0;right:0;top:180px;bottom:0;overflow:auto;background:#1a1a2e;padding:16px;text-align:center'
  viewer.appendChild(canvas)
  document.body.appendChild(viewer)
  ;(window as any).exportedCanvas = canvas
}

init()
