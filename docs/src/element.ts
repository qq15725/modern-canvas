import { fonts } from 'modern-font'
import {
  Element2D,
  Engine,
} from '../../src'

const engine = new Engine({
  debug: true,
  autoStart: true,
  autoResize: true,
})

;(window as any).engine = engine

document.body.append(engine.view!)

async function init(): Promise<void> {
  await fonts.loadFallbackFont({ family: 'fallbackFont', src: '/fonts/AaHouDiHei.woff' })

  engine.root.append([
    new Element2D({
      style: {
        left: 89.98955126220704,
        top: 45.33639278411865,
        width: 146.72623499999997,
        height: 20.246875,
      },
      background: {},
      shape: {},
      fill: {},
      outline: {},
      foreground: {
        image: 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20class%3D%22pptx-geometry--straightConnector1%22%20viewBox%3D%22-4.25%20-6.75%20142.5%2013.5%22%20style%3D%22display%3Ablock%3B%22%20data-colors%3D%22%22%20preserveAspectRatio%3D%22xMinYMin%20meet%22%20height%3D%22100%25%22%20width%3D%22100%25%22%3E%3Cdefs%3E%3Cmarker%20id%3D%22line_end_point_1088--208840905_el-uk2eb397%22%20viewBox%3D%220%200%2010%2010%22%20refX%3D%225%22%20refY%3D%225%22%20markerWidth%3D%227.5%22%20markerHeight%3D%227.5%22%20markerUnits%3D%22userSpaceOnUse%22%20orient%3D%22auto-start-reverse%22%3E%3Ccircle%20cx%3D%225%22%20cy%3D%225%22%20r%3D%225%22%20fill%3D%22rgba(9%2C205%2C133%2C1)%22%20vector-effect%3D%22non-scaling-stroke%22%3E%3C%2Fcircle%3E%3C%2Fmarker%3E%3Cpath%20d%3D%22M%200%200%20L%20134%200%22%20stroke-width%3D%221%22%20vector-effect%3D%22non-scaling-stroke%22%20id%3D%22path_1086--364668722%22%20marker-start%3D%22%22%20marker-end%3D%22url(%23line_end_point_1088--208840905_el-uk2eb397)%22%3E%3C%2Fpath%3E%3C%2Fdefs%3E%3Cg%3E%3Cg%20id%3D%22el_1084--726989629%22%3E%3Cuse%20xlink%3Ahref%3D%22%23path_1086--364668722%22%20fill%3D%22none%22%20stroke%3D%22rgba(9%2C205%2C133%2C1)%22%3E%3C%2Fuse%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E',
      },
    }),
  ])
}

init()
