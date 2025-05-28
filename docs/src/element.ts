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
        transformOrigin: 'top left',
        transform: 'scale(0.5)',
      },
    }, [
      new Element2D({
        style: { top: 100, left: 100, width: 100, height: 100 },
        outline: { width: 10, image: 'linear-gradient(0deg, blue, pink)' },
        text: 'TEXT',
      }),
      new Element2D({
        shape: {
          svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2.5 -2.5 607.5 607.5"><path d="M 0 450 L 150 300 L 150 375 L 225 375 L 225 150 L 150 150 L 300 0 L 450 150 L 375 150 L 375 375 L 450 375 L 450 300 L 600 450 L 450 600 L 450 525 L 150 525 L 150 600 Z"></path></svg>',
        },
        style: { top: 100, left: 300, fontSize: 100 },
        background: { color: '#00FFFF' },
        fill: { image: '/example.jpg' },
        outline: { color: '#0000FF' },
        text: 'TEXT',
      }),
      new Element2D({
        style: { top: 300, left: 100, fontSize: 100 },
        outline: { color: '#FF00FF' },
        text: 'TEXT',
      }),
      new Element2D({
        style: { left: 500, top: 300, width: 200, height: 200 },
        shape: {
          svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70.97 63.87" height="100%" width="100%" preserveAspectRatio="none"><defs/><g id="图层_2" data-name="图层 2"><g id="图层_1-2" data-name="图层 1"><rect x="27.11" y="46.75" width="16.76" height="13.98" fill="#EE822FFF"/><line x1="17.96" y1="60.87" x2="53.01" y2="60.87" fill="none" stroke="#EE822FFF" stroke-linecap="round" stroke-linejoin="round" stroke-width="6px"/><path d="M0,35.57v8.49a5.07,5.07,0,0,0,5.08,5.08H65.89A5.07,5.07,0,0,0,71,44.06V35.57Z" fill="#EE822FFF"/><path d="M71,31.26V5.08A5.07,5.07,0,0,0,65.89,0H5.08A5.07,5.07,0,0,0,0,5.08V31.26Z" fill="#EE822FFF"/></g></g></svg>',
        },
        fill: { color: '#00FF00' },
      }),
      new Element2D({
        style: { left: 700, top: 100, width: 222, height: 222 },
        outline: { color: '#00FF00' },
        fill: {
          image: '/example.jpg',
          tile: { scaleX: 0.25, scaleY: 0.25, translateX: 100, translateY: 100 },
        },
      }),
      new Element2D({
        style: { left: 950, top: 100, width: 222, height: 222 },
        shape: {
          svg: '<svg xmlns="http://www.w3.org/2000/svg" data-shape="gear9" viewBox="-2.5 -2.5 112.23770491803316 112.23770491803316"><defs><path id="path_53930764811577265248" d="M 74.78309066992915 16.485224634748395 L 64.71792067744941 14.666814842458653 L 73.76021982427658 25.938583575414047 L 83.81507152023735 24.063958673615215 A 42.308768787401576 42.308768787401576 0 0 1 92.60467701856443 39.28800708879096 L 82.54368126716606 37.44664193202452 L 84.59295759873271 52.750983032903555 L 94.65205942200687 50.89929956664576 A 42.308768787401576 42.308768787401576 0 0 1 91.59945818066538 68.21144676522275 L 99.38845486230905 74.84060899310299 L 95.33977797115782 81.85312307200692 L 85.70425673518344 78.42223518965095 A 42.308768787401576 42.308768787401576 0 0 1 72.23778722224787 89.72194479121526 L 73.94335857143017 99.80684873339828 L 66.33433534172761 102.5763078440584 L 61.1584326295163 93.7545000778501 A 42.308768787401576 42.308768787401576 0 0 1 43.57920516575931 93.7545000778501 L 38.40330245354798 102.5763078440584 L 30.79427922384543 99.80684873339828 L 32.49985057302771 89.72194479121526 A 42.308768787401576 42.308768787401576 0 0 1 19.03338106009214 78.42223518965095 L 9.397859824117782 81.85312307200692 L 5.349182932966547 74.84060899310299 L 13.138179614610207 68.21144676522275 A 42.308768787401576 42.308768787401576 0 0 1 10.085578373268717 50.89929956664576 L 20.144680196542886 52.750983032903555 L 22.19395652810953 37.44664193202452 L 12.132960776711142 39.28800708879096 A 42.308768787401576 42.308768787401576 0 0 1 20.92256627503823 24.063958673615222 L 30.977417970999017 25.938583575414047 L 40.01971711782618 14.666814842458653 L 29.95454712534644 16.485224634748395 A 42.308768787401576 42.308768787401576 0 0 1 46.47361745215587 10.472774738039703 L 48.32014200648657 0.41272462780347785 L 56.417495788789026 0.41272462780347785 L 58.26402034311973 10.472774738039698 A 42.308768787401576 42.308768787401576 0 0 1 74.78309066992915 16.4852246347484 Z"></path></defs><g><use href="#path_53930764811577265248" fill="#c6dee8" stroke="#4874cb" stroke-width="5"></use></g></svg>',
        },
        outline: { color: '#00FF00' },
        fill: {
          image: '/example.jpg',
          tile: { scaleX: 0.25, scaleY: 0.25, translateX: 100, translateY: 100 },
        },
      }),
      new Element2D({
        style: { left: 800, top: 350, width: 500, height: 200 },
        outline: { color: '#00FF00' },
        fill: {
          image: '/example.jpg',
          stretchRect: { left: 0.5, top: 0.5 },
        },
      }),
    ]),
  ])
}

init()
