<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { createCanvas } from '../../src'

  const canvasEl = ref()

  onMounted(async () => {
    const canvas = createCanvas({
      view: canvasEl.value,
    })

    canvas.children = [
      { type: 'image', x: 0, y: 0, w: 100, h: 100, url: '/example.jpg' },
      { type: 'image', x: 30, y: 30, w: 100, h: 100, url: '/example.jpg' },
      { type: 'image', x: 60, y: 60, w: 100, h: 100, url: '/example.jpg', fade: true },
      { type: 'image', x: 200, y: 200, w: 100, h: 100, url: '/example.jpg' },
    ]

    canvas.render()
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
