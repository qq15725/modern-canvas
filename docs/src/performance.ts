import { fonts } from 'modern-font'
import {
  CanvasItemEditor,
  Element2D,
  Engine,
} from '../../src'

const editor = new CanvasItemEditor()
const engine = new Engine({
  autoStart: true,
  autoResize: true,
  backgroundColor: '#F6F7F9',
})
;(window as any).engine = engine
engine.root.append(editor)
document.body.append(engine.view!)

async function init(): Promise<void> {
  await fonts.loadFallbackFont({ family: 'fallbackFont', src: '/fonts/AaHouDiHei.woff' })

  const length = 1500
  const size = 10
  const cols = Math.ceil(Math.sqrt(length))
  const gap = 2
  editor.drawboard.append(
    Array.from({ length }, (_, i) => {
      const x = i % cols
      const y = Math.floor(i / cols)
      return new Element2D({
        style: {
          left: x * (size + gap),
          top: y * (size + gap),
          width: size,
          height: size,
          backgroundColor: '#000',
        },
      })
    }),
  )

  console.warn(editor)
  console.warn(engine.root.toJSON())
}

init()
