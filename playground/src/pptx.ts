import { fonts } from 'modern-font'
import gifWorkerUrl from 'modern-gif/worker?url'
import {
  assets,
  Camera2D,
  DrawboardEffect,
  Engine,
  Node,
} from '../../src'

assets.gifWorkerUrl = gifWorkerUrl

const engine = new Engine({
  autoResize: true,
  autoStart: true,
})

engine.on('pointerdown', (e) => {
  ;(window as any).$$0 = e.target
  console.warn(e.target?.toJSON())
})

const camera = new Camera2D({
  internalMode: 'front',
})

;(window as any).camera = camera
;(window as any).engine = engine

engine.root.append(camera)

engine.root.append(
  new DrawboardEffect({
    internalMode: 'back',
    effectMode: 'before',
    pixelGrid: true,
    checkerboard: true,
    watermark: '/example.jpg',
  }),
)

document.body.append(engine.view!)

async function init(): Promise<void> {
  await fonts.loadFallbackFont({ family: 'fallbackFont', src: '/fonts/fallback.woff' })
  const data = await fetch('/pptx.json').then(rep => rep.json())
  engine.root.append(Node.parse(data))
  console.warn(data)
}

init()
