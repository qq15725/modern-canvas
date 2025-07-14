import { fonts } from 'modern-font'
import {
  Camera2D,
  Engine,
  Node,
} from '../../src'

const engine = new Engine({
  autoResize: true,
  autoStart: true,
})

const camera = new Camera2D()

;(window as any).engine = engine
;(window as any).camera = camera

engine.root.append(camera)
document.body.append(engine.view!)

async function init(): Promise<void> {
  await fonts.loadFallbackFont({ family: 'fallbackFont', src: '/fonts/fallback.woff' })
  const data = await fetch('/pptx.json').then(rep => rep.json())
  engine.root.append(Node.parse(data))
  console.warn(data)
}

init()
