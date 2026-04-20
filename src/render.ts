import type { Fonts } from 'modern-font'
import type { EngineData, EngineProperties } from './Engine'
import { Engine } from './Engine'

export interface RenderOptions extends Partial<EngineProperties> {
  data: EngineData
  width: number
  height: number
  debug?: boolean
  fonts?: Fonts
  keyframes?: number[]
  onBefore?: (engine: Engine) => void | Promise<void>
  onKeyframe?: (frame: Uint8ClampedArray<ArrayBuffer>, ctx: {
    currentTime: number
    duration: number
    progress: number
  }) => void | Promise<void>
}

export interface RenderResult {
  pixels: Uint8ClampedArray
  toCanvas2D: () => HTMLCanvasElement
}

let engine: Engine | undefined
const queue: (() => Promise<void>)[] = []
let starting = false

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
    onBefore,
    onKeyframe,
    ...properties
  } = options

  const width = Math.floor(_width)
  const height = Math.floor(_height)

  engine ??= new Engine({
    pixelRatio: 1,
    width: 1,
    height: 1,
    preserveDrawingBuffer: true,
  })

  // reset
  engine.resetProperties()
  engine.setProperties(properties)
  engine.debug = debug
  engine.fonts = fonts
  engine.timeline.currentTime = 0
  engine.resize(width, height, true)
  engine.root.removeChildren()
  engine.root.append(data)

  // render
  await onBefore?.(engine)
  await engine.waitAndRender()

  if (keyframes.length) {
    await new Promise<void>((resolve) => {
      let i = 0
      const len = keyframes.length
      const last = keyframes[len - 1]
      async function handle(): Promise<void> {
        if (i === len)
          return resolve()
        const currentTime = keyframes[i++]
        const next = keyframes[i] || currentTime
        const duration = next - currentTime
        engine!.timeline.currentTime = currentTime
        engine!.render()
        await onKeyframe?.(engine!.toPixels(), {
          currentTime,
          duration,
          progress: last !== 0 ? currentTime / last : 1,
        })
        requestAnimationFrame(handle)
      }
      handle()
    })
  }

  const pixels = engine.toPixels()

  return {
    pixels,
    toCanvas2D: () => engine!.toCanvas2D(new ImageData(pixels, width, height)),
  }
}

export async function render(options: RenderOptions): Promise<HTMLCanvasElement> {
  return new Promise((r) => {
    queue.push(async () => r(await task(options).then(rep => rep.toCanvas2D())))
    start()
  })
}

export async function renderPixels(options: RenderOptions): Promise<Uint8ClampedArray<ArrayBuffer>> {
  return new Promise((r) => {
    queue.push(async () => r(await task(options).then(rep => rep.pixels)))
    start()
  })
}
