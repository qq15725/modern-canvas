import { Engine } from './Engine'
import { Node } from './scene'

export interface RenderOptions {
  data: Record<string, any> | Node | (Node | Record<string, any>)[]
  width: number
  height: number
  time?: number
  onBeforeRender?: (engine: Engine) => void | Promise<void>
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

async function performRender(options: RenderOptions): Promise<HTMLCanvasElement> {
  const { data, width, height, time = 0 } = options

  engine ??= new Engine({ width: 1, height: 1 })
  engine.root.removeChildren()
  engine.timeline.currentTime = time
  engine.resize(width, height)
  ;(Array.isArray(data) ? data : [data]).forEach((v) => {
    if (v instanceof Node) {
      engine!.root.appendChild(v)
    }
    else {
      engine!.root.appendChild(Node.parse(v) as unknown as Node)
    }
  })
  await engine.waitUntilLoad()
  await options.onBeforeRender?.(engine)
  return engine.toCanvas2D()
}

export async function render(options: RenderOptions): Promise<HTMLCanvasElement> {
  start()
  return new Promise((r) => {
    queue.push(async () => r(await performRender(options)))
  })
}
