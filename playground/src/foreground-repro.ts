import { assets, Element2D, Engine } from '../../src'

// 自诊断版：在「你的运行环境」里直接打印关键数字，定位 effects 前景空白。
// 用 ?case=A|B|C 切换；?strict 模拟无 ticker 补帧（只一次 waitAndRender）。

const src = (() => {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const x = c.getContext('2d')!
  x.fillStyle = '#3366ff'
  x.fillRect(0, 0, 64, 64)
  return c.toDataURL()
})()

const CASES: Record<string, any> = {
  A: null,
  B: [{ outline: { color: '#f00', width: 6 } }],
  C: [{}],
}

function opaqueFrac(source: any): number {
  try {
    const w = Math.min(Math.round(source.width || 0), 128)
    const h = Math.min(Math.round(source.height || 0), 128)
    if (!w || !h)
      return -1
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')!
    ctx.drawImage(source, 0, 0, w, h)
    const { data } = ctx.getImageData(0, 0, w, h)
    let op = 0
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0)
        op++
    }
    return op / (data.length / 4)
  }
  catch {
    return Number.NaN
  }
}

const out: string[] = []
function log(s: string): void {
  out.push(s)
  const pre = document.getElementById('diag')!
  pre.textContent = out.join('\n')
}

async function init(): Promise<void> {
  document.body.style.cssText = 'background:#fff;font-family:monospace;font-size:13px;margin:8px'
  const pre = document.createElement('pre')
  pre.id = 'diag'
  pre.style.cssText = 'white-space:pre-wrap'
  document.body.append(pre)

  const which = new URLSearchParams(location.search).get('case') ?? 'B'
  const strict = new URLSearchParams(location.search).get('strict') != null
  const effects = CASES[which]

  log(`case=${which} strict=${strict}`)
  log(`devicePixelRatio=${globalThis.devicePixelRatio}`)
  log(`data url length=${src.length}, head=${src.slice(0, 30)}`)

  // 1) 直接探测运行时的图像解码（与 Element2DForeground._resolveSourceCanvas 同路径）
  try {
    const bmp: any = await assets.fetchImageBitmap(src)
    log(`fetchImageBitmap -> ${bmp?.constructor?.name} ${bmp?.width}x${bmp?.height}, opaqueFrac=${opaqueFrac(bmp).toFixed(3)}`)
  }
  catch (e: any) {
    log(`fetchImageBitmap THREW: ${e?.message}`)
  }

  const engine = new Engine({ width: 160, height: 160 })
  engine.view!.style.cssText = 'width:160px;height:160px;border:1px solid #ccc;display:block;margin:8px 0'
  document.body.append(engine.view!)

  const el = new Element2D({
    style: { left: 30, top: 30, width: 100, height: 100 },
    foreground: { image: src, fillWithShape: true, ...(effects ? { effects } : {}) },
  })
  engine.root.appendChild(el)

  if (strict) {
    await engine.waitUntilLoad()
    await engine.waitAndRender()
  }
  else {
    await engine.start()
    await engine.waitUntilLoad()
    await engine.waitAndRender()
  }

  // 2) 探测烘焙后的前景纹理
  const fg: any = (el as any).foreground
  const tex = fg?.texture
  log(`foreground.texture -> ${tex?.constructor?.name}, source=${tex?.source?.constructor?.name} ${tex?.source?.width}x${tex?.source?.height}`)
  if (tex?.source)
    log(`texture.source opaqueFrac=${opaqueFrac(tex.source).toFixed(3)}`)
  log(`foreground._sourceCanvas -> ${fg?._sourceCanvas?.width}x${fg?._sourceCanvas?.height}, opaqueFrac=${fg?._sourceCanvas ? opaqueFrac(fg._sourceCanvas).toFixed(3) : 'n/a'}`)
  ;(window as any).done = true
}

init()
