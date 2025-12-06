import {
  Engine,
  FlexLayout,
} from '../../src'

async function init(): Promise<void> {
  await FlexLayout.load()

  const engine = new Engine({
    autoStart: true,
    autoResize: true,
    backgroundColor: '#F6F7F9',
  })

  ;(window as any).engine = engine

  document.body.append(engine.view!)

  engine.root.append([
    {
      is: 'Element2D',
      style: { width: 300 },
      children: [
        {
          is: 'Element2D',
          style: { width: 100, height: 100 },
          shadow: { blur: 4, offsetX: 4, offsetY: 4, color: 'rgba(0, 0, 0, .4)' },
          foreground: { image: '/example.jpg' },
        },
        {
          is: 'Element2D',
          style: { width: 100, height: 100 },
          shadow: { blur: 2 },
          foreground: { image: '/example.jpg', cropRect: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5 } },
        },
        {
          is: 'Element2D',
          style: { width: 100, height: 100, maskImage: '/mask1.png' },
          shadow: { blur: 2 },
          foreground: { image: '/example.jpg' },
        },
        {
          is: 'Element2D',
          style: { width: 100, height: 100, filter: 'brightness(52%) contrast(90%) saturate(128%) sepia(18%)' },
          shadow: { blur: 2 },
          foreground: { image: '/example.jpg' },
        },
      ],
    },

  ])
}

init()
