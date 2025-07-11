import { fonts } from 'modern-font'
import {
  Engine,
  Node,
} from '../../src'

const engine = new Engine({
  autoStart: true,
})

;(window as any).engine = engine

document.body.append(engine.view!)

async function init(): Promise<void> {
  await fonts.loadFallbackFont({ family: 'fallbackFont', src: '/fonts/fallback.woff' })
  const data = await fetch('/pptx.json').then(rep => rep.json())
  const doc = Node.parse(data)
  const { width, height } = doc.children[0].style
  engine.resize(width, height * doc.children.length, true)
  engine.root.append(doc)

  console.warn(data)
}

init()
