import {
  Engine,
  Timeline,
} from '../../src'

const engine = new Engine({
  autoStart: true,
  autoResize: true,
  timeline: Timeline.from([0, 5000], true),
})
;(window as any).engine = engine
document.body.append(engine.view!)

async function init(): Promise<void> {
  engine.root.append([
    {
      is: 'Element2D',
      delay: 0,
      duration: 1500,
      children: [
        {
          is: 'Element2D',
          name: 'example.png',
          style: { width: 100, height: 100 },
          foreground: { image: '/example.png' },
        },
      ],
    },

    {
      is: 'Element2D',
      delay: 1500,
      duration: 1500,
      children: [
        {
          is: 'Element2D',
          name: 'example.jpg',
          style: { width: 100, height: 100 },
          foreground: { image: '/example.jpg' },
        },
      ],
    },
  ])
}

init()
