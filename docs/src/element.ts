import { fonts } from 'modern-font'
import {
  Element2D,
  Engine,
} from '../../src'

const engine = new Engine({
  debug: true,
  autoStart: true,
  autoResize: true,
})

;(window as any).engine = engine

document.body.append(engine.view!)

async function init(): Promise<void> {
  fonts.fallbackFont = await fonts.load({ family: 'fallbackFont', src: '/fonts/AaHouDiHei.woff' })

  engine.root.append([
    new Element2D({
      style: { top: 100, left: 100, width: 100, height: 100 },
      outline: { width: 10, color: '#0000FF' },
      text: { content: 'TEXT' },
    }),
    new Element2D({
      geometry: {
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2.5 -2.5 607.5 607.5"><path d="M 0 450 L 150 300 L 150 375 L 225 375 L 225 150 L 150 150 L 300 0 L 450 150 L 375 150 L 375 375 L 450 375 L 450 300 L 600 450 L 450 600 L 450 525 L 150 525 L 150 600 Z"></path></svg>',
      },
      style: { top: 100, left: 300, fontSize: 100 },
      fill: { color: '#00FF00', image: '/example.jpg' },
      outline: { width: 10, color: '#0000FF' },
      text: { content: 'TEXT' },
    }),
  ])
}

init()
