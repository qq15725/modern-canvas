import {
  Engine, Timeline,
} from '../../src'

function testcase(left: number, top: number, children: Record<string, any>[] = []): any {
  return [
    {
      is: 'Element2D',
      style: { left, top, width: 100, height: 100 },
      foreground: { image: '/example.jpg' },
      children,
    },
    {
      is: 'Element2D',
      style: { left: left + 100, top, width: 100, height: 100 },
      foreground: { image: '/example.png' },
      children,
    },
    {
      is: 'Element2D',
      style: { left: left + 200, top, width: 100, height: 100 },
      foreground: { image: '/mask1.png' },
      children,
    },
  ]
}

async function init(): Promise<void> {
  const engine = new Engine({
    autoStart: true,
    autoResize: true,
    timeline: Timeline.from([0, 5000], true),
    data: [
      { is: 'Camera2D' },
      {
        is: 'Element2D',
        style: { width: 1000, height: 600, overflow: 'hidden' },
        children: [
          ...testcase(100, 10, [{ is: 'Node' }]),
          ...testcase(100, 120, [{ is: 'GaussianBlurEffect' }]),
          ...testcase(100, 230, [{ is: 'KawaseBlurEffect' }]),
          ...testcase(100, 340, [{ is: 'ZoomBlurEffect' }]),
          ...testcase(100, 450, [{ is: 'DropShadowEffect' }]),
          ...testcase(100, 560, [{ is: 'OutlineEffect' }]),
          ...testcase(500, 10, [{ is: 'MaskEffect', src: '/mask1.png' }]),
          ...testcase(500, 120, [{ is: 'EmbossEffect' }]),
          ...testcase(500, 230, [{ is: 'PixelateEffect' }]),
          ...testcase(500, 340, [{ is: 'GlitchEffect' }]),
          ...testcase(500, 450, [{ is: 'GodrayEffect' }]),
        ],
      },
      { is: 'LeftEraseTransition' },
      {
        is: 'Element2D',
        style: { left: 1000, top: 0, width: 100, height: 100 },
        foreground: { image: '/example.jpg' },
      },
    ],
  })

  engine.on('pointerdown', (e) => {
    ;(window as any).$$0 = e.target
    console.warn(e.target?.toJSON())
  })

  ;(window as any).engine = engine

  document.body.append(engine.view!)
}

init()
