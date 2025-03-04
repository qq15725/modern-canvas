import type { Element2DStyleProperties } from '../../src'
import { fonts } from 'modern-font'
import {
  Element2D,

  Engine, Image2D, Timeline,
} from '../../src'

const engine = new Engine({
  autoStart: true,
  autoResize: true,
  backgroundColor: '#F6F7F9',
  timeline: Timeline.from([0, 5000], true),
})
;(window as any).engine = engine
document.body.append(engine.view!)

function createTestcase(style: Partial<Element2DStyleProperties> = {}): any {
  return [
    // base
    new Image2D({
      style: {
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        ...style,
      },
      src: '/example.jpg',
    }),

    // crop
    new Image2D({
      style: {
        left: 100,
        top: 0,
        width: 100,
        height: 100,
        ...style,
      },
      src: '/example.jpg',
      srcRect: {
        left: 0.5,
        right: 0.5,
        top: 0.5,
        bottom: 0.5,
      },
    }),

    // mask
    new Image2D({
      style: {
        left: 200,
        top: 0,
        width: 100,
        height: 100,
        maskImage: '/mask1.png',
        ...style,
      },
      src: '/example.jpg',
    }),

    // filter
    new Image2D({
      style: {
        left: 300,
        top: 0,
        width: 100,
        height: 100,
        filter: 'brightness(52%) contrast(90%) saturate(128%) sepia(18%)',
        ...style,
      },
      src: '/example.jpg',
    }),
  ]
}

async function init(): Promise<void> {
  fonts.fallbackFont = await fonts.load({ family: 'fallbackFont', src: '/fonts/AaHouDiHei.woff' })

  engine.root.append([
    new Element2D({
      style: {
        top: 100,
      },
    }, [
      ...createTestcase(),
    ]),

    new Element2D({
      style: {
        top: 200,
      },
    }, [
      ...createTestcase({ opacity: 0.5 }),
    ]),

    new Element2D({
      style: {
        top: 300,
      },
    }, [
      ...createTestcase({ rotate: 4 }),
    ]),

    new Element2D({
      style: {
        top: 400,
      },
    }, [
      ...createTestcase({ rotate: 60 }),
    ]),

    new Element2D({
      style: {
        top: 500,
      },
    }, [
      ...createTestcase({ rotate: 60, scaleX: 0.5, scaleY: 0.5 }),
    ]),
  ])
}

init()
