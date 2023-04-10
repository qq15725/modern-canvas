<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { createCanvas, plugins } from '../../src'

  const canvasEl = ref()

  onMounted(async () => {
    const canvas = createCanvas({
      view: canvasEl.value,
      children: [
        { x: 0, y: 0, width: 30, height: 30, rotation: 30, image: '/example.jpg' },
        { x: 30, y: 30, width: 200, height: 200, image: '/example.png' },
        { x: 60, y: 60, width: 120, height: 120, rotation: 50, image: '/example.jpg', fade: true },
        { x: 200, y: 200, width: 100, height: 100, image: '/example.png' },
        { x: 30, y: 30, width: 100, height: 100, rotation: 40, text: 'example' },
      ],
      plugins,
    })

    await canvas.load()

    canvas.startRenderLoop()
  })
</script>

<template>
  <div style="text-align: center;">
    <canvas ref="canvasEl" style="width: 400px; border: 1px solid grey;" width="400" height="400" />
  </div>
</template>

<style>
  html body {
    margin: 0;
  }
</style>
