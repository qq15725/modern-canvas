import { fonts } from 'modern-font'
import {
  CSElement2D,
  Engine,
  Image2D, Timeline,
} from '../../src'

const engine = new Engine({
  autoStart: true,
  autoResize: true,
  backgroundColor: '#F6F7F9',
  timeline: Timeline.from([0, 5000], true),
})
;(window as any).engine = engine
document.body.append(engine.view!)

async function init(): Promise<void> {
  fonts.fallbackFont = await fonts.load({ family: 'fallbackFont', src: '/fonts/AaHouDiHei.woff' })

  engine.root.append([
    new CSElement2D({
      style: {
        left: 100,
        top: 100,
      },
    }, [
      new Image2D({
        style: {
          left: 100,
          top: 0,
          width: 100,
          height: 100,
        },
        src: '/example.jpg',
      }),
    ]),
  ])
}

init()
