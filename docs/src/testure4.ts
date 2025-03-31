import { fonts } from 'modern-font'
import {
  Engine,
  Image2D,
  LeftEraseTransition,
  Node2D,
  Timeline, Video2D,
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
  await fonts.loadFallbackFont({ family: 'fallbackFont', src: '/fonts/AaHouDiHei.woff' })

  engine.root.append([
    new Image2D({
      style: {
        left: 200,
        top: 50,
        width: 100,
        height: 100,
      },
      src: '/example.jpg',
    }),
    new Video2D({
      style: {
        left: 200,
        top: 200,
        width: 100,
        height: 100,
        maskImage: '/example.png',
      },
      src: '/example.mp4',
    }),
    new LeftEraseTransition({
      delay: 1000,
      duration: 2000,
    }),
    new Node2D({
      delay: 1500,
    }, [
      new Image2D({
        style: {
          left: 200,
          top: 50,
          width: 300,
          height: 300,
        },
        src: '/example.jpg',
      }),
    ]),
  ])
}

init()
