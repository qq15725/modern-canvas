<h1 align="center">modern-canvas</h1>

<p align="center">
  <a href="https://unpkg.com/modern-canvas">
    <img src="https://img.shields.io/bundlephobia/minzip/modern-canvas" alt="Minzip">
  </a>
  <a href="https://www.npmjs.com/package/modern-canvas">
    <img src="https://img.shields.io/npm/v/modern-canvas.svg" alt="Version">
  </a>
  <a href="https://www.npmjs.com/package/modern-canvas">
    <img src="https://img.shields.io/npm/dm/modern-canvas" alt="Downloads">
  </a>
  <a href="https://github.com/qq15725/modern-canvas/issues">
    <img src="https://img.shields.io/github/issues/qq15725/modern-canvas" alt="Issues">
  </a>
  <a href="https://github.com/qq15725/modern-canvas/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/modern-canvas.svg" alt="License">
  </a>
</p>

## Features

- WebGL and WebGL2

- Animation

- Special effects

- Transition effects

- Describe element as you would a CSSStyle

## 📦 Install

```shell
npm i modern-canvas
```

## 🦄 Usage

```javascript
import { Animation, Engine, Image2D, Text2D, Video2D } from 'modern-canvas'
import { fonts } from 'modern-font'

async function loadFallbackFont() {
  fonts.fallbackFont = await fonts.load({ family: 'fallbackFont', src: '/fallback.woff' })
}

loadFallbackFont().then(() => {
  const engine = new Engine({ width: 500, height: 500 }).start()

  engine.root.addChild(
    new Image2D({
      style: {
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        rotate: 30,
        opacity: 0.5,
        backgroundColor: '#00FF00',
        filter: 'brightness(102%) contrast(90%) saturate(128%) sepia(18%)',
      },
      src: '/example.png',
    }, [
      new Animation({
        duration: 3000,
        loop: true,
        keyframes: [
          { offset: 1, rotate: 180 },
        ],
      }),
      new Text2D({
        fonts,
        style: {
          fontSize: 30,
        },
        content: '/example.png',
      }),
      new Video2D({
        style: {
          left: 200,
          top: 200,
          width: 100,
          height: 100,
          maskImage: '/example.png',
        },
        src: '/example.mp4',
      }),
    ])
  )

  console.log(engine)

  document.body.append(engine.view)
})
```

## Special effect

See all [preset special effects](./src/scene/effects)

```typescript
import { EmbossEffect, Image2D } from 'modern-canvas'

engine.root.addChild(
  new Image2D({
    src: '/example.png',
  }, [
    new EmbossEffect(),
  ])
)
```

## Transition effect

See all [preset transitions](./src/scene/transitions)

```typescript
import { Image2D, TiltShiftTransition } from 'modern-canvas'

engine.root.addChild(
  new Image2D({
    src: '/example.png',
  }),
  new TiltShiftTransition(),
  new Image2D({
    src: '/example.gif',
  }),
)
```

Use https://github.com/gl-transitions/gl-transitions with `vite`

```ts
import bounceGLSL from 'gl-transitions/transitions/Bounce.glsl?raw'
import { Transition } from 'modern-canvas'

engine.root.addChild(
  new Image2D({
    src: '/example.png',
  }),
  new Transition({ glsl: bounceGLSL }),
  new Image2D({
    src: '/example.gif',
  }),
)
```
