import {
  Element2D,
  Engine,
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
      style: { top: 100, width: 1000, height: 100 },
    }, [
      // base
      new Element2D({
        style: { left: 10, top: 0, width: 100, height: 100 },
        outline: { width: 10, color: 'rgba(0, 0, 0, .4)' },
        foreground: { image: '/example.jpg' },
      }),

      // crop
      new Element2D({
        style: { left: 120, top: 0, width: 100, height: 100 },
        outline: { width: 10 },
        foreground: { image: '/example.jpg', cropRect: { left: 0.2, right: 0.2, top: 0.2, bottom: 0.2 } },
      }),

      // mask
      new Element2D({
        style: { left: 230, top: 0, width: 100, height: 100, maskImage: '/mask1.png' },
        outline: { width: 10 },
        foreground: { image: '/example.jpg' },
      }),

      // filter
      new Element2D({
        style: { left: 340, top: 0, width: 100, height: 100, filter: 'brightness(52%) contrast(90%) saturate(128%) sepia(18%)' },
        outline: { width: 10 },
        foreground: { image: '/example.jpg' },
      }),
    ]),
  ])
}

init()
