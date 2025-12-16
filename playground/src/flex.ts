import { Engine, FlexLayout } from '../../src'

async function init(): Promise<void> {
  await FlexLayout.load()

  const engine = new Engine({
    autoStart: true,
    autoResize: true,
    data: [
      { is: 'Camera2D' },
      {
        is: 'Element2D',
        style: { display: 'flex', left: 100, top: 100, width: 1000, height: 400 },
        children: [
          { is: 'Element2D', style: { width: 100, height: 100, backgroundColor: '#000000FF' } },
          { is: 'Element2D', style: { width: 100, height: 100, backgroundColor: '#000000DD' } },
          { is: 'Element2D', style: { width: 100, height: 100, backgroundColor: '#000000CC' } },
          { is: 'Element2D', style: { width: 100, height: 100, backgroundColor: '#000000BB' } },
          { is: 'Element2D', style: { width: 100, height: 100, backgroundColor: '#000000AA' } },
          { is: 'Element2D', style: { width: 100, height: 100, backgroundColor: '#0000FFFF' } },
          { is: 'Element2D', style: { width: 100, height: 100, backgroundColor: '#0000FFDD' } },
        ],
      },
    ],
  })

  engine.on('pointerdown', (e) => {
    (window as any).$$0 = e.target
    console.warn(e.target)
  })

  ;(window as any).engine = engine

  document.body.append(engine.view!)
}

init()
