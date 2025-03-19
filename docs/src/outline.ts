import {
  Element2D,
  Engine,
  Image2D,
} from '../../src'

const engine = new Engine({
  autoStart: true,
  autoResize: true,
  backgroundColor: '#F6F7F9',
})

;(window as any).engine = engine

document.body.append(engine.view!)

async function init(): Promise<void> {
  engine.root.append([
    new Element2D({
      style: {
        top: 100,
        width: 1000,
        height: 100,
      },
    }, [
      // base
      new Image2D({
        style: {
          left: 10,
          top: 0,
          width: 100,
          height: 100,
        },
        outline: { width: 5, color: 'rgba(0, 0, 0, .4)' },
        src: '/example.jpg',
      }),

      // crop
      new Image2D({
        style: {
          left: 120,
          top: 0,
          width: 100,
          height: 100,
        },
        outline: { width: 2 },
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
          left: 230,
          top: 0,
          width: 100,
          height: 100,
          maskImage: '/mask1.png',
        },
        outline: { width: 2 },
        src: '/example.jpg',
      }),

      // filter
      new Image2D({
        style: {
          left: 340,
          top: 0,
          width: 100,
          height: 100,
          filter: 'brightness(52%) contrast(90%) saturate(128%) sepia(18%)',
        },
        outline: { width: 2 },
        src: '/example.jpg',
      }),
    ]),
  ])
}

init()
