import { fonts } from 'modern-font'
import {
  Engine,
  Text2D,
} from '../../src'

const engine = new Engine({
  autoStart: true,
  width: 600,
  height: 600,
  pixelRatio: 4,
})

engine.view!.style.border = '1px solid red'

let scale = 1

function handleWheelEvent(event: WheelEvent): void {
  event.preventDefault()
  const zoomFactor = 0.01
  if (event.deltaY < 0) {
    scale += zoomFactor
  }
  else {
    scale = Math.max(0.1, scale - zoomFactor)
  }
  engine.pixelRatio = scale * 2
}

window.addEventListener('wheel', handleWheelEvent, { passive: false })

;(window as any).engine = engine

document.body.append(engine.view!)

async function init(): Promise<void> {
  await fonts.loadFallbackFont({ family: 'fallbackFont', src: '/fonts/AaHouDiHei.woff' })

  engine.root.append([
    new Text2D({
      style: {
        fontSize: 100,
        left: 100,
        top: 100,
        height: 20,
        highlightImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUxLjM2NDYgNDUuODY0MkM0OS43ODA4IDQ2LjI3ODIgNDcuOTA2IDQ2LjcwNSA0NS44NTg4IDQ3LjA4NTdNNDUuODU4OCA0Ny4wODU3QzM0LjE2NDkgNDkuMjYwNyAxNi44NDg2IDQ5LjkzNDMgMTYuMDI3NyAzOC4xNDg0QzE1LjIyIDI2LjU1MzMgMzIuMjY0IDIyLjM2MzYgNDUuNjEzNSAyNC41NjI2QzUzLjYwMSAyNS44NzgzIDU3LjQ1MDcgMjkuNjIwOCA1Ny45Mjg1IDM0LjIzN0M1OC4yODExIDM3LjY0MzUgNTUuNzc4IDQzLjM3MDIgNDUuODU4OCA0Ny4wODU3Wk00NS44NTg4IDQ3LjA4NTdDNDIuMzM2NyA0OC40MDUxIDM3Ljg3OTUgNDkuNDcwOCAzMi4yODMgNTAuMDg5MSIgc3Ryb2tlPSIjRkZDMzAwIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo=',
      },
      content: 'XXXXXX',
    }),
  ])
}

init()
