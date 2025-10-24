import { fonts } from 'modern-font'
import {
  Animation,
  Camera2D,
  Element2D,
  Engine,
} from '../../src'

const engine = new Engine({
  autoStart: true,
  autoResize: true,
})

engine.on('pointerdown', (e) => {
  ;(window as any).$$0 = e.target
  console.warn(e.target?.toJSON())
})

engine.root.append(new Camera2D())

;(window as any).engine = engine

document.body.append(engine.view!)

async function init(): Promise<void> {
  await fonts.loadFallbackFont({ family: 'fallbackFont', src: '/fonts/fallback.woff' })

  engine.root.append([
    new Element2D({
      style: {
        width: 500,
        height: 500,
        fontSize: 100,
        textDecoration: 'underline',
      },
      foreground: {
        image: '/example.gif',
      },
      text: {
        content: [
          {
            fragments: [
              {
                content: 'Highhhh',
              },
              {
                content: 'lig',
                highlightImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUxLjM2NDYgNDUuODY0MkM0OS43ODA4IDQ2LjI3ODIgNDcuOTA2IDQ2LjcwNSA0NS44NTg4IDQ3LjA4NTdNNDUuODU4OCA0Ny4wODU3QzM0LjE2NDkgNDkuMjYwNyAxNi44NDg2IDQ5LjkzNDMgMTYuMDI3NyAzOC4xNDg0QzE1LjIyIDI2LjU1MzMgMzIuMjY0IDIyLjM2MzYgNDUuNjEzNSAyNC41NjI2QzUzLjYwMSAyNS44NzgzIDU3LjQ1MDcgMjkuNjIwOCA1Ny45Mjg1IDM0LjIzN0M1OC4yODExIDM3LjY0MzUgNTUuNzc4IDQzLjM3MDIgNDUuODU4OCA0Ny4wODU3Wk00NS44NTg4IDQ3LjA4NTdDNDIuMzM2NyA0OC40MDUxIDM3Ljg3OTUgNDkuNDcwOCAzMi4yODMgNTAuMDg5MSIgc3Ryb2tlPSIjRkZDMzAwIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo=',
              },
              {
                content: 'ht',
                highlightImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE5LjkyNzcgNDcuMzU4OUg1My4wMDc4IiBzdHJva2U9IiM3MUUzNUIiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtZGFzaGFycmF5PSIwLjEgOCIvPgo8L3N2Zz4K',
              },
            ],
          },
          {
            fragments: [
              {
                content: 'High',
              },
              {
                content: 'ligh',
                highlightImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE5LjkyNzcgNDcuMzU4OUg1My4wMDc4IiBzdHJva2U9IiM3MUUzNUIiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtZGFzaGFycmF5PSIwLjEgOCIvPgo8L3N2Zz4K',
              },
              {
                content: 't',
              },
            ],
          },
          {
            fragments: [
              {
                content: 'Highlig',
              },
              {
                content: 'ht',
                highlightImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQyLjE2MDIgMzcuMTk0TDUxLjQ5NDkgMzAuNzc5MUM1MS41MTgxIDMwLjc2MzIgNTEuNTU0MSAzMC43ODAzIDUxLjUzODEgMzAuODAzNEM1MC4zODQ4IDMyLjQ2NTEgMzYuMDQzOSA1My4zNzQ4IDU2LjAyMDIgMzcuMTk0TTQyLjE1ODggMzcuMTk0QzIyLjE4MjYgNTMuMzc0OCAzNi41MjM1IDMyLjQ2NTEgMzcuNjc2OCAzMC44MDM0QzM3LjY5MjggMzAuNzgwMyAzNy42NTY3IDMwLjc2MzIgMzcuNjMzNiAzMC43NzkxTDI4LjI5ODggMzcuMTk0QzguMzIyNTggNTMuMzc0OCAyMi42NjQxIDMyLjQ2NTEgMjMuODE3NCAzMC44MDM0QzIzLjgzMzQgMzAuNzgwMyAyMy43OTc0IDMwLjc2MzIgMjMuNzc0MiAzMC43NzkxTDE0LjQzOTUgMzcuMTk0IiBzdHJva2U9IiM4OERBRjkiIHN0cm9rZS13aWR0aD0iOC44MiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+Cjwvc3ZnPgo=',
              },
            ],
          },
        ],
      },
    }, [
      new Animation({
        loop: true,
        keyframes: [
          { offset: 1, rotate: 180 },
        ],
      }),
    ]),
    new Element2D(
      {
        style: {
          left: 300,
          width: 1000,
          height: 1300,
          fontSize: 100,
          fontFamily: 'AaHouDiHei',
          lineHeight: 2,
          highlightReferImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNzIgNzIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDcyIDcyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxnPgoJPHBhdGggZD0iTTE5LjMsMzguMWMwLjIsMC41LDAuNCwwLjksMC43LDEuNGMwLjIsMC4zLDAuNCwwLjQsMC44LDAuNGMwLjMsMCwwLjUtMC4xLDAuNi0wLjRjMC4xLTAuMywwLjEtMC42LDAuMi0wLjkgICBjMC0wLjIsMC4xLTAuNCwwLjMtMC41YzAuMi0wLjEsMC40LTAuMiwwLjYtMC4xYzAuMiwwLDAuNCwwLjEsMC41LDAuM2MwLjEsMC4yLDAuMiwwLjQsMC4xLDAuNmMtMC4xLDAuNi0wLjIsMS4yLTAuNCwxLjcgICBjLTAuMywwLjgtMC45LDEuMi0xLjcsMS4yYy0wLjksMC0xLjYtMC40LTIuMS0xLjJjLTAuMy0wLjQtMC41LTAuOC0wLjctMS4zYy0wLjQsMC4zLTEsMC42LTEuNywxYy0wLjUsMC4yLTAuOCwwLjEtMS4xLTAuMyAgIGMtMC4yLTAuNS0wLjEtMC45LDAuMy0xLjFjMC43LTAuNCwxLjQtMC44LDEuOS0xLjFjLTAuMi0wLjktMC40LTIuMS0wLjUtMy43TDE1LjksMzRjLTAuMiwwLTAuNCwwLTAuNi0wLjEgICBjLTAuMi0wLjEtMC4zLTAuMy0wLjMtMC41YzAtMC4yLDAtMC40LDAuMi0wLjZzMC4zLTAuMywwLjUtMC4zbDEuMi0wLjFjLTAuMS0wLjktMC4xLTEuOS0wLjEtMi45YzAtMC4yLDAuMS0wLjQsMC4yLTAuNiAgIGMwLjItMC4xLDAuMy0wLjIsMC42LTAuMmMwLjIsMCwwLjQsMC4xLDAuNiwwLjJjMC4yLDAuMSwwLjIsMC4zLDAuMywwLjZjMCwwLjEsMCwxLDAuMSwyLjdsMy4yLTAuNGMwLjIsMCwwLjQsMCwwLjUsMC4xICAgYzAuMiwwLjEsMC4zLDAuMywwLjMsMC41czAsMC40LTAuMSwwLjVjLTAuMSwwLjItMC4zLDAuMy0wLjUsMC4zbC0zLjMsMC40YzAuMSwxLjIsMC4yLDIuMSwwLjMsMi44YzAuNy0wLjYsMS40LTEuNCwyLTIuMiAgIGMwLjMtMC40LDAuNy0wLjQsMS4xLTAuMmMwLjQsMC4zLDAuNCwwLjcsMC4yLDFDMjEuMywzNi4zLDIwLjQsMzcuMywxOS4zLDM4LjF6IE0yMC42LDMxLjFjLTAuMy0wLjItMC43LTAuNS0xLjEtMC44ICAgYy0wLjMtMC4zLTAuMy0wLjYtMC4xLTAuOWMwLjMtMC4zLDAuNi0wLjQsMS0wLjJjMC40LDAuMiwwLjcsMC41LDEuMSwwLjdjMC40LDAuMywwLjQsMC42LDAuMiwxQzIxLjMsMzEuMywyMSwzMS4zLDIwLjYsMzEuMXogICAgTTIzLjMsMzAuOWMwLTAuMiwwLjEtMC40LDAuMi0wLjVjMC4xLTAuMSwwLjMtMC4yLDAuNi0wLjJzMC40LDAuMSwwLjYsMC4yYzAuMSwwLjEsMC4yLDAuMywwLjIsMC41djYuNWMwLDAuMi0wLjEsMC40LTAuMiwwLjUgICBjLTAuMSwwLjEtMC4zLDAuMi0wLjYsMC4ycy0wLjQtMC4xLTAuNi0wLjJjLTAuMS0wLjEtMC4yLTAuMy0wLjItMC41VjMwLjl6IE0yNC4zLDQxLjZjLTAuMiwwLTAuNC0wLjEtMC42LTAuMiAgIGMtMC4yLTAuMS0wLjItMC4zLTAuMi0wLjZjMC0wLjIsMC4xLTAuNCwwLjItMC42YzAuMi0wLjEsMC4zLTAuMiwwLjYtMC4yaDAuOWMwLjYsMCwxLTAuNCwxLTEuMXYtOS40YzAtMC4yLDAuMS0wLjQsMC4yLTAuNiAgIGMwLjItMC4xLDAuMy0wLjIsMC42LTAuMmMwLjIsMCwwLjQsMC4xLDAuNiwwLjJjMC4yLDAuMSwwLjIsMC4zLDAuMiwwLjZWMzljMCwwLjgtMC4yLDEuNS0wLjcsMS45cy0xLjEsMC43LTEuOCwwLjdIMjQuM3oiLz4KCTxwYXRoIGQ9Ik00MC42LDM3LjdoLTMuOHYwLjdoNC40YzAuMSwwLDAuMywwLjEsMC40LDAuMmMwLjEsMC4xLDAuMiwwLjIsMC4yLDAuNGMwLDAuMS0wLjEsMC4zLTAuMiwwLjRjLTAuMSwwLjEtMC4yLDAuMi0wLjQsMC4yICAgaC00LjR2MC43SDQyYzAuMiwwLDAuMywwLjEsMC40LDAuMmMwLjEsMC4xLDAuMiwwLjIsMC4yLDAuNHMtMC4xLDAuMy0wLjIsMC40Yy0wLjEsMC4xLTAuMiwwLjItMC40LDAuMkgzMGMtMC4yLDAtMC4zLTAuMS0wLjQtMC4yICAgYy0wLjEtMC4xLTAuMi0wLjItMC4yLTAuNHMwLjEtMC4zLDAuMi0wLjRjMC4xLTAuMSwwLjItMC4yLDAuNC0wLjJoNS4ydi0wLjdoLTQuNGMtMC4xLDAtMC4zLTAuMS0wLjQtMC4ycy0wLjItMC4yLTAuMi0wLjQgICBjMC0wLjEsMC4xLTAuMywwLjItMC40czAuMi0wLjIsMC40LTAuMmg0LjR2LTAuN2gtMy43aDBjLTAuMiwwLTAuNC0wLjEtMC42LTAuMnMtMC4yLTAuMy0wLjItMC42di0zLjFjMC0wLjIsMC4xLTAuNCwwLjItMC42ICAgYzAuMS0wLjEsMC4zLTAuMiwwLjYtMC4yaDMuOHYtMC44SDMwYy0wLjIsMC0wLjMtMC4xLTAuNC0wLjJjLTAuMS0wLjEtMC4yLTAuMi0wLjItMC40czAuMS0wLjMsMC4yLTAuNGMwLjEtMC4xLDAuMi0wLjIsMC40LTAuMiAgIGg1LjJ2LTAuOGMtMS40LDAtMi45LDAuMS00LjMsMC4xYy0wLjIsMC0wLjMsMC0wLjQtMC4xYy0wLjEtMC4xLTAuMi0wLjItMC4yLTAuNGMwLTAuMiwwLTAuMywwLjItMC40YzAuMS0wLjEsMC4zLTAuMiwwLjQtMC4yICAgYzMuMywwLDYuOC0wLjEsMTAuMi0wLjNjMC4yLDAsMC4zLDAsMC40LDAuMmMwLjEsMC4xLDAuMiwwLjMsMC4yLDAuNGMwLDAuMiwwLDAuMy0wLjEsMC40Yy0wLjEsMC4xLTAuMiwwLjItMC40LDAuMiAgIGMtMS4xLDAtMi41LDAuMS00LjMsMC4xdjAuOGg1LjFjMC4yLDAsMC4zLDAuMSwwLjQsMC4yYzAuMSwwLjEsMC4yLDAuMiwwLjIsMC40cy0wLjEsMC4zLTAuMiwwLjRjLTAuMSwwLjEtMC4yLDAuMi0wLjQsMC4yaC01LjEgICB2MC44aDMuOGMwLjIsMCwwLjQsMC4xLDAuNiwwLjJjMC4xLDAuMSwwLjIsMC4zLDAuMiwwLjZ2My4xYzAsMC4yLTAuMSwwLjQtMC4yLDAuNkM0MSwzNy43LDQwLjgsMzcuNyw0MC42LDM3Ljd6IE0zNS4xLDM0LjlWMzQgICBoLTIuOXYwLjlIMzUuMXogTTM1LjEsMzYuN3YtMC45aC0yLjl2MC45SDM1LjF6IE0zOS44LDM0LjlWMzRoLTIuOXYwLjlIMzkuOHogTTM5LjgsMzYuN3YtMC45aC0yLjl2MC45SDM5Ljh6Ii8+Cgk8cGF0aCBkPSJNNDUuNSw0MS4xYy0wLjMsMC40LTAuNywwLjUtMS4xLDAuM2MtMC40LTAuMy0wLjUtMC43LTAuMy0xLjFsMS0xLjdjMC4zLTAuNCwwLjctMC41LDEuMS0wLjNjMC40LDAuMywwLjUsMC43LDAuMywxLjEgICBMNDUuNSw0MS4xeiBNNTUsMzcuN2MtMC4xLDAtMC4xLDAtMC4yLDBoLTguOWMtMC4zLDAtMC41LTAuMS0wLjYtMC4yYy0wLjItMC4yLTAuMi0wLjQtMC4yLTAuNnYtMy40YzAtMC4yLDAuMS0wLjQsMC4yLTAuNiAgIGMwLjEtMC4xLDAuMy0wLjIsMC42LTAuMmgzLjN2LTMuMWMwLTAuMiwwLjEtMC40LDAuMi0wLjZjMC4yLTAuMiwwLjQtMC4yLDAuNi0wLjJzMC40LDAuMSwwLjYsMC4yYzAuMiwwLjIsMC4yLDAuNCwwLjIsMC42djAuM0g1NiAgIGMwLjIsMCwwLjQsMC4xLDAuNiwwLjJjMC4xLDAuMSwwLjIsMC4zLDAuMiwwLjZzLTAuMSwwLjQtMC4yLDAuNWMtMC4xLDAuMS0wLjMsMC4yLTAuNiwwLjJoLTUuMnYxLjNoNGMwLjIsMCwwLjQsMC4xLDAuNiwwLjIgICBjMC4xLDAuMSwwLjIsMC4zLDAuMiwwLjZ2My40QzU1LjYsMzcuMyw1NS40LDM3LjYsNTUsMzcuN3ogTTUzLjksMzYuMnYtMmgtNy4xdjJINTMuOXogTTQ5LjYsNDAuN2MwLDAuMy0wLjEsMC41LTAuMiwwLjYgICBjLTAuMiwwLjEtMC40LDAuMi0wLjYsMC4yYy0wLjIsMC0wLjQtMC4xLTAuNi0wLjJjLTAuMS0wLjItMC4yLTAuNC0wLjItMC42bDAtMS42YzAtMC4yLDAuMS0wLjQsMC4yLTAuNmMwLjItMC4yLDAuMy0wLjIsMC42LTAuMiAgIHMwLjQsMC4xLDAuNiwwLjJjMC4yLDAuMiwwLjIsMC40LDAuMiwwLjZWNDAuN3ogTTUyLjgsNDAuN2MwLDAuMi0wLjEsMC40LTAuMiwwLjZjLTAuMiwwLjEtMC40LDAuMi0wLjYsMC4yICAgYy0wLjIsMC0wLjQtMC4xLTAuNi0wLjJjLTAuMi0wLjEtMC4yLTAuMy0wLjItMC42bDAtMS42YzAtMC4yLDAuMS0wLjQsMC4yLTAuNmMwLjItMC4yLDAuMy0wLjIsMC42LTAuMmMwLjIsMCwwLjQsMC4xLDAuNiwwLjIgICBjMC4yLDAuMiwwLjIsMC40LDAuMiwwLjZWNDAuN3ogTTU2LjYsNDAuM2MwLjIsMC40LDAuMSwwLjgtMC4zLDEuMWMtMC41LDAuMy0wLjgsMC4yLTEuMS0wLjNsLTEtMS43Yy0wLjItMC41LTAuMS0wLjgsMC4zLTEuMSAgIGMwLjUtMC4yLDAuOS0wLjEsMS4xLDAuM0w1Ni42LDQwLjN6Ii8+CjwvZz4KPC9zdmc+',
        },
        text: {
          content: [
            {
              fragments: [
                {
                  content: '双11 减到宝了',
                  highlightImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNzIgNzIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDcyIDcyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxwYXRoIHN0eWxlPSJmaWxsOm5vbmU7c3Ryb2tlOiM2ODlERkM7c3Ryb2tlLXdpZHRoOjY7c3Ryb2tlLW1pdGVybGltaXQ6MTA7IiBkPSJNMTIuNCw0MC44aDQ3LjIiLz4KPC9zdmc+',
                },
              ],
            },
            {
              fragments: [
                {
                  content: '双11 减到宝了',
                  highlightImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNzIgNzIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDcyIDcyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxwYXRoIHN0eWxlPSJmaWxsOm5vbmU7c3Ryb2tlOiMzQkRBRjQ7c3Ryb2tlLXdpZHRoOjI7c3Ryb2tlLW1pdGVybGltaXQ6MTA7IiBkPSJNNTkuMSw0My44Yy0yLjgsMy4zLTYuNyw1LjItMTAsNS4yICBjLTIuNCwwLTUuNy00LTguNC00LjNzLTYuNCw0LjgtOC43LDVjLTIuMiwwLjEtNi44LTQuOC05LjYtNC44Yy0yLjksMC05LjcsNS41LTkuNyw1LjUiLz4KPC9zdmc+',
                },
              ],
            },
            {
              fragments: [
                {
                  content: '双11 减到宝了',
                  highlightImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNzIgNzIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDcyIDcyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxwYXRoIHN0eWxlPSJmaWxsOm5vbmU7c3Ryb2tlOiM3NzY4RUE7c3Ryb2tlLXdpZHRoOjI7c3Ryb2tlLW1pdGVybGltaXQ6MTA7IiBkPSJNNTguNSw0NS4xbC0yLjIsMmwtMi4yLTJsLTIuMiwybC0yLjItMmwtMi4yLDIgIGwtMi4yLTJsLTIuMiwybC0yLjItMmwtMi4yLDJsLTIuMi0ybC0yLjYsMS42bC0xLjktMS42bC0yLjIsMmwtMi4yLTJsLTIuMiwybC0yLjItMmwtMi4yLDJsLTIuMi0ybC0yLjIsMmwtMi4yLTIiLz4KPC9zdmc+',
                },
              ],
            },
            {
              fragments: [
                {
                  content: '双11 减到宝了',
                  highlightImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNzIgNzIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDcyIDcyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxwYXRoIHN0eWxlPSJmaWxsOm5vbmU7c3Ryb2tlOiNGRkQ3NTc7c3Ryb2tlLXdpZHRoOjM7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO3N0cm9rZS1taXRlcmxpbWl0OjEwOyIgZD0iICBNNTguNSw0NS4xbC0yLjIsMmwtMi4yLTJsLTIuMiwybC0yLjItMmwtMi4yLDJsLTIuMi0ybC0yLjIsMmwtMi4yLTJsLTIuMiwybC0yLjItMmwtMi42LDEuNmwtMS45LTEuNmwtMi4yLDJsLTIuMi0ybC0yLjIsMmwtMi4yLTIgIGwtMi4yLDJsLTIuMi0ybC0yLjIsMmwtMi4yLTIiLz4KPC9zdmc+',
                },
              ],
            },
            {
              fragments: [
                {
                  content: '双11 减到宝了',
                  highlightImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNzIgNzIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDcyIDcyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxwYXRoIHN0eWxlPSJmaWxsOm5vbmU7c3Ryb2tlOiNGOTVBOEY7c3Ryb2tlLXdpZHRoOjAuNzU7c3Ryb2tlLW1pdGVybGltaXQ6MTA7IiBkPSJNNjEuNSwzMy40Yy0wLjItMS44LTEuMS0zLjUtMi41LTQuNiAgYy00LjMtMy44LTEzLjQtNS45LTIzLjMtNS4zQzI2LDIzLDE3LjIsMjUsMTMsMjguNmMtMS40LDEuMS0yLjQsMi44LTIuNSw0LjZjMCwwLjUsMCwxLDAuMSwxLjVjLTAuMiwwLjYtMC4zLDEuMi0wLjMsMS45ICBjMC4yLDEuOCwxLjEsMy41LDIuNSw0LjZjMy44LDMuNCwxMS41LDUuNCwyMC4xLDUuNGMwLjgsMCwxLjYsMCwyLjQtMC4xYzEuMywwLjEsMi42LDAuMSwzLjksMC4xYzguNSwwLDE2LTEuOSwxOS43LTUuMyAgYzEuNC0xLjEsMi40LTIuOCwyLjUtNC42YzAtMC42LDAtMS4zLTAuMi0xLjlDNjEuNSwzNC40LDYxLjUsMzMuOSw2MS41LDMzLjR6Ii8+CjxwYXRoIHN0eWxlPSJmaWxsOm5vbmU7c3Ryb2tlOiNGOTVBOEY7c3Ryb2tlLXdpZHRoOjAuNzU7c3Ryb2tlLW1pdGVybGltaXQ6MTA7IiBkPSJNNjAuOSwzMy40YzAsMC4xLDAsMC4yLDAsMC40ICBjLTIuMy00LjQtOS45LTguMy0xOS42LTkuN2M3LjUsMC4zLDE0LDIuMiwxNy4zLDUuMkM1OS45LDMwLjIsNjAuNywzMS44LDYwLjksMzMuNEw2MC45LDMzLjR6Ii8+CjxwYXRoIHN0eWxlPSJmaWxsOm5vbmU7c3Ryb2tlOiNGOTVBOEY7c3Ryb2tlLXdpZHRoOjAuNzU7c3Ryb2tlLW1pdGVybGltaXQ6MTA7IiBkPSJNMzYuNSw0NS45aC0xaC0wLjJDMjIuNyw0NSwxMi41LDQwLjIsMTEuMiwzNC43ICBjMS43LTUuMywxMS43LTkuOSwyNC4xLTEwLjdoMC40bDEsMC4xQzQ5LDI1LDU5LDI5LjYsNjAuNiwzNC45QzU5LjMsNDAuMyw0OS4xLDQ1LjEsMzYuNSw0NS45eiIvPgo8cGF0aCBzdHlsZT0iZmlsbDpub25lO3N0cm9rZTojRjk1QThGO3N0cm9rZS13aWR0aDowLjc1O3N0cm9rZS1taXRlcmxpbWl0OjEwOyIgZD0iTTExLjEsMzMuM2MwLjItMS42LDEtMy4xLDIuMy00LjIgIGMzLjMtMi45LDkuNC00LjcsMTYuNi01Yy05LjQsMS41LTE2LjcsNS4yLTE4LjksOS41QzExLjEsMzMuNSwxMS4xLDMzLjQsMTEuMSwzMy4zeiIvPgo8cGF0aCBzdHlsZT0iZmlsbDpub25lO3N0cm9rZTojRjk1QThGO3N0cm9rZS13aWR0aDowLjc1O3N0cm9rZS1taXRlcmxpbWl0OjEwOyIgZD0iTTExLDM2LjZjMC0wLjIsMC0wLjQsMC0wLjcgIGMyLDQuNSw5LjQsOC41LDE5LjEsMTBjLTcuMi0wLjQtMTMuNS0yLjMtMTYuOC01LjJDMTIsMzkuNywxMS4yLDM4LjIsMTEsMzYuNkwxMSwzNi42eiIvPgo8cGF0aCBzdHlsZT0iZmlsbDpub25lO3N0cm9rZTojRjk1QThGO3N0cm9rZS13aWR0aDowLjc1O3N0cm9rZS1taXRlcmxpbWl0OjEwOyIgZD0iTTYxLDM2LjhjLTAuMiwxLjctMSwzLjItMi4zLDQuMiAgYy0zLjQsMy0xMCw0LjgtMTcuNyw1LjFjMTAtMS40LDE3LjktNS40LDE5LjktMTBDNjAuOSwzNi4zLDYxLDM2LjUsNjEsMzYuOEw2MSwzNi44eiIvPgo8L3N2Zz4=',
                },
              ],
            },
            {
              fragments: [
                {
                  content: '双11 减到宝了',
                  highlightImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNzIgNzIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDcyIDcyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qwe2ZpbGw6I0Y5NkEyMzt9Cjwvc3R5bGU+CjxyZWN0IHg9IjEyLjQiIHk9IjM1LjkiIGNsYXNzPSJzdDAiIHdpZHRoPSI0NyIgaGVpZ2h0PSI4LjMiLz4KPC9zdmc+',
                },
              ],
            },
            {
              fragments: [
                {
                  content: '双11 减到宝了',
                  highlightImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNzIgNzIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDcyIDcyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qwe2ZpbGw6IzREREZGNzt9Cjwvc3R5bGU+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xNC4zLDQ1LjVjMy4xLDAuOSw2LjMsMiw5LjYsMS45YzEuMy0wLjMsMi42LTAuOSwzLjgtMS44YzEuNi0xLjEsMy43LTIuMyw1LjctMS41YzIuNywwLjYsNSwzLjIsNy44LDIuMyAgYzUuNC0yLjUsMTEuMy0yLjIsMTYuNSwxYy0xLjgtMC44LTMuNy0wLjItNS40LTAuNmMtMi43LTAuNS01LjUtMC40LTguMiwwLjZjLTEuOCwwLjgtMy43LDEuOS01LjcsMS4xYy0yLTAuOC0zLjQtMS44LTUuMy0yLjMgIGMtMC44LTAuMy0xLjctMC4zLTIuNSwwYy0xLjcsMC41LTMuMywyLTUuMiwyLjdDMjEuNyw1MC4xLDE3LjgsNDYuOSwxNC4zLDQ1LjVMMTQuMyw0NS41eiIvPgo8L3N2Zz4=',
                },
              ],
            },
            {
              fragments: [
                {
                  content: '双11 减到宝了',
                  highlightImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNzIgNzIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDcyIDcyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qwe2ZpbGw6I0ZDRTUxNzt9Cjwvc3R5bGU+CjxyZWN0IHg9IjEyLjYiIHk9IjQ0LjEiIGNsYXNzPSJzdDAiIHdpZHRoPSI1IiBoZWlnaHQ9IjMiLz4KPHJlY3QgeD0iMTkuNSIgeT0iNDQuMSIgY2xhc3M9InN0MCIgd2lkdGg9IjUiIGhlaWdodD0iMyIvPgo8cmVjdCB4PSIyNi41IiB5PSI0NC4xIiBjbGFzcz0ic3QwIiB3aWR0aD0iNSIgaGVpZ2h0PSIzIi8+CjxyZWN0IHg9IjMzLjUiIHk9IjQ0LjEiIGNsYXNzPSJzdDAiIHdpZHRoPSI1IiBoZWlnaHQ9IjMiLz4KPHJlY3QgeD0iNDAuNSIgeT0iNDQuMSIgY2xhc3M9InN0MCIgd2lkdGg9IjUiIGhlaWdodD0iMyIvPgo8cmVjdCB4PSI1NC41IiB5PSI0NC4xIiBjbGFzcz0ic3QwIiB3aWR0aD0iNSIgaGVpZ2h0PSIzIi8+CjxyZWN0IHg9IjQ3LjUiIHk9IjQ0LjEiIGNsYXNzPSJzdDAiIHdpZHRoPSI1IiBoZWlnaHQ9IjMiLz4KPC9zdmc+',
                },
              ],
            },
            {
              fragments: [
                {
                  content: '双11 减到宝了',
                  highlightImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNzIgNzIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDcyIDcyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxwYXRoIHN0eWxlPSJmaWxsOiNGQ0VFMjE7IiBkPSJNNjEuOSwzNC45Yy0xLTEtMi43LTAuOS0zLjcsMC4xbC0xLjksMmMwLjMtMC45LDAtMS45LTAuNy0yLjZsLTAuMS0wLjFjLTEtMC45LTIuNi0wLjktMy41LDAuMSAgbC0yLjIsMi4zYzAtMC43LTAuMy0xLjMtMC44LTEuOGwtMC4xLTAuMWMtMS0wLjktMi42LTAuOS0zLjUsMC4xbC0yLjcsMi45YzAuOC0xLDAuNy0yLjUtMC4yLTMuNGwtMC4yLTAuMWMtMS0wLjktMi42LTAuOS0zLjUsMC4xICBsLTIuMiwyLjNjMC0wLjctMC4zLTEuMy0wLjgtMS44TDM1LjYsMzVjLTEtMC45LTIuNi0wLjktMy41LDAuMUwyOS4zLDM4YzAuOC0xLDAuNy0yLjUtMC4yLTMuNEwyOSwzNC41Yy0xLTAuOS0yLjYtMC45LTMuNSwwLjEgIEwyMy4zLDM3YzAtMC43LTAuMy0xLjMtMC44LTEuN2wtMC4xLTAuMWMtMS0wLjktMi42LTAuOS0zLjUsMC4xbC04LjksOS41Yy0wLjksMS0wLjksMi42LDAuMSwzLjVsMC4xLDAuMWMxLDAuOSwyLjYsMC45LDMuNS0wLjEgIGwyLjItMi4zYzAsMC43LDAuMywxLjMsMC44LDEuOGwwLjEsMC4xYzEsMC45LDIuNiwwLjksMy41LTAuMWwyLjctMi45Yy0wLjgsMS0wLjcsMi41LDAuMiwzLjRsMC4xLDAuMWMxLDAuOSwyLjYsMC45LDMuNS0wLjEgIGwyLjItMi4zYzAsMC43LDAuMywxLjMsMC44LDEuOGwwLjEsMC4xYzEsMC45LDIuNiwwLjksMy41LTAuMWwyLjctMi45Yy0wLjgsMS0wLjcsMi41LDAuMiwzLjRsMC4xLDAuMWMxLDAuOSwyLjYsMC45LDMuNS0wLjEgIGwyLjItMi4zYzAsMC43LDAuMywxLjMsMC44LDEuOGwwLjEsMC4xYzEsMC45LDIuNiwwLjksMy41LTAuMWwyLTIuMWMtMC4zLDEtMC4xLDIsMC43LDIuN2wwLDBjMSwxLDIuNywwLjksMy43LTAuMWw4LjgtOS40ICBDNjMsMzcuNSw2Mi45LDM1LjksNjEuOSwzNC45eiIvPgo8L3N2Zz4=',
                },
              ],
            },
            {
              fragments: [
                {
                  content: '双11 减到宝了',
                  highlightImage: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHg9IjBweCIgeT0iMHB4IiB2aWV3Qm94PSIwIDAgNzIgNzIiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDcyIDcyOyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qye2ZpbGw6bm9uZTtzdHJva2U6I0Y5NUE4RjtzdHJva2Utd2lkdGg6MC43NTtzdHJva2UtbWl0ZXJsaW1pdDoxMDt9Cjwvc3R5bGU+CjxwYXRoIGNsYXNzPSJzdDIiIGQ9Ik02MS41LDMzLjRjLTAuMi0xLjgtMS4xLTMuNS0yLjUtNC42Yy00LjMtMy44LTEzLjQtNS45LTIzLjMtNS4zQzI2LDIzLDE3LjIsMjUsMTMsMjguNiAgYy0xLjQsMS4xLTIuNCwyLjgtMi41LDQuNmMwLDAuNSwwLDEsMC4xLDEuNWMtMC4yLDAuNi0wLjMsMS4yLTAuMywxLjljMC4yLDEuOCwxLjEsMy41LDIuNSw0LjZjMy44LDMuNCwxMS41LDUuNCwyMC4xLDUuNCAgYzAuOCwwLDEuNiwwLDIuNC0wLjFjMS4zLDAuMSwyLjYsMC4xLDMuOSwwLjFjOC41LDAsMTYtMS45LDE5LjctNS4zYzEuNC0xLjEsMi40LTIuOCwyLjUtNC42YzAtMC42LDAtMS4zLTAuMi0xLjkgIEM2MS41LDM0LjQsNjEuNSwzMy45LDYxLjUsMzMuNHoiLz4KPHBhdGggY2xhc3M9InN0MiIgZD0iTTYwLjksMzMuNGMwLDAuMSwwLDAuMiwwLDAuNGMtMi4zLTQuNC05LjktOC4zLTE5LjYtOS43YzcuNSwwLjMsMTQsMi4yLDE3LjMsNS4yICBDNTkuOSwzMC4yLDYwLjcsMzEuOCw2MC45LDMzLjRMNjAuOSwzMy40eiIvPgo8cGF0aCBjbGFzcz0ic3QyIiBkPSJNMzYuNSw0NS45aC0xaC0wLjJDMjIuNyw0NSwxMi41LDQwLjIsMTEuMiwzNC43YzEuNy01LjMsMTEuNy05LjksMjQuMS0xMC43aDAuNGwxLDAuMUM0OSwyNSw1OSwyOS42LDYwLjYsMzQuOSAgQzU5LjMsNDAuMyw0OS4xLDQ1LjEsMzYuNSw0NS45eiIvPgo8cGF0aCBjbGFzcz0ic3QyIiBkPSJNMTEuMSwzMy4zYzAuMi0xLjYsMS0zLjEsMi4zLTQuMmMzLjMtMi45LDkuNC00LjcsMTYuNi01Yy05LjQsMS41LTE2LjcsNS4yLTE4LjksOS41ICBDMTEuMSwzMy41LDExLjEsMzMuNCwxMS4xLDMzLjN6Ii8+CjxwYXRoIGNsYXNzPSJzdDIiIGQ9Ik0xMSwzNi42YzAtMC4yLDAtMC40LDAtMC43YzIsNC41LDkuNCw4LjUsMTkuMSwxMGMtNy4yLTAuNC0xMy41LTIuMy0xNi44LTUuMkMxMiwzOS43LDExLjIsMzguMiwxMSwzNi42ICBMMTEsMzYuNnoiLz4KPHBhdGggY2xhc3M9InN0MiIgZD0iTTYxLDM2LjhjLTAuMiwxLjctMSwzLjItMi4zLDQuMmMtMy40LDMtMTAsNC44LTE3LjcsNS4xYzEwLTEuNCwxNy45LTUuNCwxOS45LTEwQzYwLjksMzYuMyw2MSwzNi41LDYxLDM2LjggIEw2MSwzNi44eiIvPgo8L3N2Zz4=',
                },
              ],
            },
          ],
        },
      },
    ),
    new Element2D({
      style: {
        fontSize: 100,
        left: 800,
        top: 100,
        width: 800,
      },
      text: {
        outline: {
          color: '#00FF00',
          width: 2,
        },
        content: '一乙二十丁厂七卜人入八九几儿了力乃刀又三干亏士工土才寸下丈与万上小口巾山千乞川亿个勺久凡及夕丸么广亡门义之尸弓己已子卫也女飞刃习叉马乡丰王井开夫天无元专云扎艺木五支厅不太犬区历尤友匹车巨牙屯比互切瓦止少日中冈贝内水见午牛手毛气升长仁什片仆化仇币仍仅斤爪反介父从今凶分乏公仓月氏勿欠风丹匀乌凤勾文六方火为斗忆计订户认心尺引丑巴孔队办以允予劝双书幻玉刊示末未击打巧正扑扒功扔去甘世古节本术可丙左厉右石布龙平灭轧东卡北占业旧帅归且旦目叶甲申叮电号田由史只央兄叼叫另叨叹四生失禾丘付仗代仙们仪白仔他斥瓜乎丛令用甩印乐句匆册犯外处冬鸟务包饥主市立闪兰半汁汇头汉宁穴它讨写让礼训必议讯记永司尼民出辽奶奴加召皮边发圣对台矛纠母幼丝式刑动扛寺吉扣考托老执巩扩扫地扬场耳共芒亚芝朽朴机权过臣再协西压厌在百存而页匠夸夺灰达列死成夹轨划迈毕至此贞师尘尖劣光当早吐吓虫曲团同吊吃因吸吗屿帆岁回岂则刚网肉年朱先丢舌竹迁乔伟传乒乓休伍伏优伐延件任伤价份体何但伸作伯伶佣低你住位伴身皂近彻役返余希坐谷妥含邻岔肝肚肠龟免狂犹角删条卵岛迎饭饮系言冻状亩况床库疗应冷这序辛弃冶忘闲间闷判灶灿弟汪沙汽沃泛沧没沟沪沈沉怀忧快完宋宏牢究穷灾良证启评补初社识诉诊词译君灵即层尿尾迟局改张忌际陆阿陈阻附妙妖妨努忍劲鸡驱纯纱纲纳驳纷纸纹纺驴纽寿弄麦形进戒吞远违运扶抚坛技坏扰拒找批扯走抄坝贡攻赤折抓扮抢孝均抛投坟抗坑坊抖护壳志块扭声把报却劫芽花芹芬苍芳严芦劳克苏杆杠杜材村杏极李杨求更束豆两丽医辰励否还来连步坚旱盯呈时助县里呆园围呀吨足邮男困吵串员听吹呜吧呕吼财针钉告我乱利秃秀私每兵估体何佐依停借赁储',
      },
    }),
  ])
}

init()
