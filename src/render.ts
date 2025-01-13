import { Engine } from './Engine'
import { Node } from './scene'

let engine: Engine | undefined
let renderLoop: Promise<void> | undefined
const queue: (() => Promise<void>)[] = []

export interface RenderOptions {
  data: Record<string, any> | Node | (Node | Record<string, any>)[]
  width: number
  height: number
}

async function startRenderLoop(sleep = 100): Promise<void> {
  while (true) {
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
}

async function performRender(options: RenderOptions): Promise<HTMLCanvasElement> {
  engine ??= new Engine({ width: 1, height: 1 })
  const root = engine.root
  root.removeChildren()

  const { data, width, height } = options
  engine.resize(width, height)
  ;(Array.isArray(data) ? data : [data]).forEach((v) => {
    if (v instanceof Node) {
      root.addChild(v)
    }
    else {
      root.addChild(Node.parse(v) as unknown as Node)
    }
  })
  await engine.waitUntilLoad()
  return engine.toCanvas2D()
}

export async function render(options: RenderOptions): Promise<HTMLCanvasElement> {
  renderLoop ??= startRenderLoop()
  return new Promise((r) => {
    queue.push(async () => r(await performRender(options)))
  })
}
