import type { Fonts } from 'modern-font'
import type { EngineData, EngineProperties } from './Engine'
import type { ImagePipelineResolver } from './scene/2d/element/imagePipeline'
import { Engine } from './Engine'

export interface RenderOptions extends Partial<EngineProperties> {
  data: EngineData
  width: number
  height: number
  debug?: boolean
  fonts?: Fonts
  keyframes?: number[]
  /** 图片处理管线解析器：设到渲染引擎实例，使带 imagePipelines 的图片填充在渲染时烘焙。 */
  imagePipelineResolver?: ImagePipelineResolver
  onBefore?: (engine: Engine) => void | Promise<void>
  onKeyframe?: (frame: Uint8ClampedArray<ArrayBuffer>, ctx: {
    currentTime: number
    duration: number
    progress: number
  }) => void | Promise<void>
}

export interface RenderResult {
  pixels: Uint8ClampedArray<ArrayBuffer>
  toCanvas2D: () => HTMLCanvasElement
}

let engine: Engine | undefined
const queue: (() => Promise<void>)[] = []
let starting = false

export function getRenderEngine(): Engine {
  return engine ??= new Engine({
    pixelRatio: 1,
    width: 1,
    height: 1,
    preserveDrawingBuffer: true,
  })
}

async function start(sleep = 100): Promise<void> {
  if (starting) {
    return
  }
  starting = true
  while (queue.length) {
    const cb = queue.shift()
    if (cb) {
      try {
        await cb()
      }
      catch (e) {
        console.error(e)
      }
    }
    else {
      await new Promise(r => setTimeout(r, sleep))
    }
  }
  starting = false
}

async function task(options: RenderOptions): Promise<RenderResult> {
  const {
    debug = false,
    fonts,
    width: _width,
    height: _height,
    data,
    keyframes = [],
    imagePipelineResolver,
    onBefore,
    onKeyframe,
    ...properties
  } = options

  // 尺寸兜底到至少 1：宽/高为 0（如选区/画布 aabb 退化）会让 toImageData 的
  // new ImageData(pixels, 0, 0) 抛 IndexSizeError，进而在导出队列里表现为永久挂起。
  const width = Math.max(1, Math.floor(_width))
  const height = Math.max(1, Math.floor(_height))

  const engine = getRenderEngine()

  // reset
  engine.resetProperties()
  engine.setProperties(properties)
  engine.debug = debug
  engine.fonts = fonts
  engine.timeline.currentTime = 0
  // Export keeps the root at full logical size but caps the canvas/render passes
  // at the GPU limit; toPixels() does the actual (tiled) rendering. Rendering at
  // the full size here would overflow MAX_TEXTURE_SIZE for oversized exports.
  engine.resizeForExport(width, height)
  // 每次显式设置（含 undefined，清掉上次渲染残留），使带 imagePipelines 的图片填充按本次解析器烘焙。
  engine.imagePipelineResolver = imagePipelineResolver
  engine.root.removeChildren(true)
  engine.root.append(data)

  // render
  await onBefore?.(engine)
  await engine.waitUntilProcessed()

  if (keyframes.length) {
    const len = keyframes.length
    const last = keyframes[len - 1]
    for (let i = 0; i < len; i++) {
      const currentTime = keyframes[i]
      const next = keyframes[i + 1] || currentTime
      const duration = next - currentTime
      engine.timeline.currentTime = currentTime
      await engine.waitUntilProcessed()
      await onKeyframe?.(engine.toPixels(), {
        currentTime,
        duration,
        progress: last !== 0 ? currentTime / last : 1,
      })
    }
  }

  const pixels = engine.toPixels()

  return {
    pixels,
    toCanvas2D: () => engine!.toCanvas2D(new ImageData(pixels, width, height)),
  }
}

export async function render(options: RenderOptions): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    // 必须 try/catch 转 reject：task 抛错时若只调 resolve，外层 await 永不 settle，
    // 导出会卡死（start() 的 try/catch 只吞错日志，不会让本 Promise 失败）。
    queue.push(async () => {
      try {
        resolve(await task(options).then(rep => rep.toCanvas2D()))
      }
      catch (e) {
        reject(e)
      }
    })
    start()
  })
}

export async function renderPixels(options: RenderOptions): Promise<Uint8ClampedArray<ArrayBuffer>> {
  return new Promise((resolve, reject) => {
    queue.push(async () => {
      try {
        resolve(await task(options).then(rep => rep.pixels))
      }
      catch (e) {
        reject(e)
      }
    })
    start()
  })
}
