import type { Fonts } from 'modern-font'
import { Engine } from './Engine'
import { Node } from './scene'

export interface RenderOptions {
  data: Record<string, any> | Node | (Node | Record<string, any>)[]
  width: number
  height: number
  debug?: boolean
  fonts?: Fonts
  keyframes?: number[]
  onBefore?: (engine: Engine) => void | Promise<void>
  onFrame?: (frame: Uint8ClampedArray, ctx: {
    currentTime: number
    duration: number
    progress: number
  }) => Promise<void>
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

async function task(options: RenderOptions): Promise<HTMLCanvasElement> {
  const {
    debug = false,
    fonts,
    width,
    height,
    data,
    keyframes = [],
    onBefore,
    onFrame,
  } = options

  engine ??= new Engine({
    pixelRatio: 1,
    width: 1,
    height: 1,
    preserveDrawingBuffer: true,
  })

  // reset
  engine.debug = debug
  engine.fonts = fonts
  engine.timeline.currentTime = 0
  engine.root.removeChildren()
  engine.resize(width, height, true)
  ;(Array.isArray(data) ? data : [data]).forEach((v) => {
    if (v instanceof Node) {
      v.parent = undefined
      engine!.root.appendChild(v)
    }
    else {
      engine!.root.appendChild(Node.parse(v) as unknown as Node)
    }
  })

  // render
  await onBefore?.(engine)
  await engine.waitAndRender()
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
      await onFrame?.(engine!.toPixels(), {
        currentTime,
        duration,
        progress: currentTime / last,
      })
      requestAnimationFrame(handle)
    }
    handle()
  })

  return engine.toCanvas2D()
}

export async function render(options: RenderOptions): Promise<HTMLCanvasElement> {
  return new Promise((r) => {
    queue.push(async () => r(await task(options)))
    start()
  })
}
