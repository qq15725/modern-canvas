import {
  Engine,
} from '../../src'

function testcase(left: number, top: number, style?: Record<string, any>): any {
  return [
    {
      is: 'Element2D',
      style: { left, top, width: 100, height: 100, ...style },
      foreground: { image: '/example.jpg' },
    },
    {
      is: 'Element2D',
      style: { left: left + 100, top, width: 100, height: 100, ...style },
      foreground: { image: '/example.png' },
    },
    {
      is: 'Element2D',
      style: { left: left + 200, top, width: 100, height: 100, ...style },
      foreground: { image: '/mask1.png' },
    },
  ]
}

const filters = {
  冷白: 'brightness(115%) contrast(112%) saturate(128%) sepia(14%)',
  童年记忆: 'brightness(79%) contrast(149%) saturate(54%) sepia(17%)',
  秋日暖阳: 'brightness(88%) contrast(130%) saturate(158%) sepia(28%)',
  浪漫夏日: 'contrast(79%) saturate(217%)',
  黑白胶片: 'grayscale(100%)',
  泛黄岁月: 'brightness(94%) contrast(97%) saturate(106%) hue-rotate(11deg) sepia(41%)',
  纯真年代: 'contrast(63%) saturate(112%)',
  清澈: 'brightness(94%) contrast(143%) saturate(161%)',
  小幸运: 'brightness(109%) contrast(109%) saturate(82%) hue-rotate(18deg)',
  马卡龙: 'brightness(95%) contrast(127%) saturate(216%)',
  复古时代: 'brightness(63%) contrast(234%) saturate(85%)',
  清亮: 'brightness(87%) contrast(282%) saturate(134%) sepia(32%)',
  暖橘: 'brightness(76%) contrast(121%) saturate(182%)',
}

const engine = new Engine({
  autoStart: true,
  autoResize: true,
  data: [
    { is: 'Camera2D' },
    ...Object.keys(filters).flatMap((k, i) => {
      return testcase(10, i * 110 + 10, { filter: (filters as any)[k] })
    }),
  ],
})

engine.on('pointerdown', (e) => {
  ;(window as any).$$0 = e.target
  console.warn(e.target?.toJSON())
})

;(window as any).engine = engine

document.body.append(engine.view!)
