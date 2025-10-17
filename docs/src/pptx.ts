import { fonts } from 'modern-font'
import {
  Camera2D,
  DrawboardEffect,
  Engine,
  Node,
} from '../../src'

const engine = new Engine({
  autoResize: true,
  autoStart: true,
  // msaa: true,
  // antialias: true,
})

engine.on('pointerdown', (e) => {
  ;(window as any).$$0 = e.target
  console.warn(e.target?.toJSON())
})

;(window as any).engine = engine

engine.root.append(
  new Camera2D({
    internalMode: 'front',
  }),
)

engine.root.append(
  new DrawboardEffect({
    internalMode: 'back',
    effectMode: 'before',
    pixelGrid: true,
    checkerboard: true,
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
