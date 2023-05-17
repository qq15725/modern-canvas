<script setup lang="ts">
  import { onMounted, reactive, ref } from 'vue'
  import { Renderer2d, createApp } from '../../src'
  import type { App, Node } from '../../src'

  const viewEl = ref()
  const app = ref<App>()
  const activeElement = ref<Node>()
  const children = reactive([
    {
      type: 'image',
      style: {
        left: 0,
        top: 0,
        width: 130,
        height: 130,
        rotation: 30,
      },
      filters: [
        { type: 'fade' },
      ],
      src: '/example.jpg',
    },
    {
      type: 'text',
      style: {
        left: 60,
        top: 60,
        width: 240,
        height: 240,
        rotation: 0,
        fontSize: 40,
        color: 'red',
      },
      content: 'TEXT',
    },
    {
      type: 'video',
      style: {
        left: 60,
        top: 60,
        width: 30,
        height: 30,
        rotation: 30,
      },
      src: 'example.mp4',
    },
  ])

  onMounted(async () => {
    app.value = createApp({
      view: viewEl.value,
      children,
      plugins: [
        Renderer2d,
      ],
    })
    await app.value.load()
    app.value.render()
  })

  function throttle<T extends (...args: any[]) => any>(fn: T, limit: number) {
    let throttling = false
    return (...args: Parameters<T>): void | ReturnType<T> => {
      if (!throttling) {
        throttling = true
        setTimeout(() => (throttling = false), limit)
        return fn(...args)
      }
    }
  }

  const render = throttle(() => app.value?.render(), 20)

  const pointer = {
    startX: 0,
    startY: 0,
    elX: 0,
    elY: 0,
    elW: 0,
    elH: 0,
    elR: 0,
  }
  let currentKey: string | undefined
  function onMoveStart(event: MouseEvent, key?: string) {
    if (!activeElement.value) return
    currentKey = key
    pointer.startX = event.clientX
    pointer.startY = event.clientY
    pointer.elX = activeElement.value.style.left ?? 0
    pointer.elY = activeElement.value.style.top ?? 0
    pointer.elW = activeElement.value.style.width ?? 0
    pointer.elH = activeElement.value.style.height ?? 0
    pointer.elR = activeElement.value.style.rotation ?? 0
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onMoveEnd, true)
  }
  function onMove(event: MouseEvent) {
    if (!activeElement.value) return
    switch (currentKey) {
      case 't':
        activeElement.value.style.top = pointer.elY + (event.clientY - pointer.startY)
        activeElement.value.style.height = pointer.elH - (event.clientY - pointer.startY)
        break
      case 'b':
        activeElement.value.style.height = pointer.elH + (event.clientY - pointer.startY)
        break
      case 'l':
        activeElement.value.style.left = pointer.elX + (event.clientX - pointer.startX)
        activeElement.value.style.width = pointer.elW - (event.clientX - pointer.startX)
        break
      case 'r':
        activeElement.value.style.width = pointer.elW + (event.clientX - pointer.startX)
        break
      case 'lt':
        activeElement.value.style.top = pointer.elY + (event.clientY - pointer.startY)
        activeElement.value.style.height = pointer.elH - (event.clientY - pointer.startY)
        activeElement.value.style.left = pointer.elX + (event.clientX - pointer.startX)
        activeElement.value.style.width = pointer.elW - (event.clientX - pointer.startX)
        break
      case 'lb':
        activeElement.value.style.left = pointer.elX + (event.clientX - pointer.startX)
        activeElement.value.style.width = pointer.elW - (event.clientX - pointer.startX)
        activeElement.value.style.height = pointer.elH + (event.clientY - pointer.startY)
        break
      case 'rt':
        activeElement.value.style.width = pointer.elW + (event.clientX - pointer.startX)
        activeElement.value.style.top = pointer.elY + (event.clientY - pointer.startY)
        activeElement.value.style.height = pointer.elH - (event.clientY - pointer.startY)
        break
      case 'rb':
        activeElement.value.style.width = pointer.elW + (event.clientX - pointer.startX)
        activeElement.value.style.height = pointer.elH + (event.clientY - pointer.startY)
        break
      case 'lt-r':
      case 'lb-r':
      case 'rt-r':
      case 'rb-r':
        activeElement.value.style.rotation = pointer.elR + (event.clientX - pointer.startX) + (event.clientY - pointer.startY)
        break
      default:
        activeElement.value.style.left = event.clientX - pointer.startX + pointer.elX
        activeElement.value.style.top = event.clientY - pointer.startY + pointer.elY
        break
    }
    render()
  }
  function onMoveEnd() {
    render()
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onMoveEnd, true)
  }
</script>

<template>
  <div class="editor">
    <canvas
      ref="viewEl"
      style="width: 100%;"
      width="400"
      height="400"
    />

    <div
      v-for="(node, key) in children"
      :key="key"
      class="placeholder"
      :style="{
        width: `${node.style.width}px`,
        height: `${node.style.height}px`,
        transform: `translate(${node.style.left}px, ${node.style.top}px) rotate(${node.style.rotation ?? 0}deg)`,
      }"
      @mousedown.stop.prevent="(event) => {
        activeElement = node
        onMoveStart(event)
      }"
    />

    <div
      v-if="activeElement"
      class="transformer"
      :style="{
        width: `${activeElement.style.width}px`,
        height: `${activeElement.style.height}px`,
        transform: `translate(${activeElement.style.left}px, ${activeElement.style.top}px) rotate(${activeElement.style.rotation ?? 0}deg)`,
      }"
      @mousedown.stop.prevent="onMoveStart"
    >
      <div
        v-for="key in ['t', 'b', 'l', 'r', 'lt', 'lb', 'rt', 'rb', 'lt-r', 'lb-r', 'rt-r', 'rb-r']"
        :key="key"
        :class="`transformer__handle transformer__handle--${key}`"
        @mousedown.stop.prevent="onMoveStart($event, key)"
      />
    </div>
  </div>
</template>

<style>
  html body {
    margin: 0;
  }

  .editor {
    position: relative;
    width: 400px;
    height: 400px;
    margin: auto;
    border: 1px solid grey;
  }

  .placeholder {
    position: absolute;
    left: 0;
    top: 0;
  }

  .placeholder:hover {
    outline: 1px dashed red;
  }

  .transformer {
    --size: 6px;
    --color: #2f80ed;

    position: absolute;
    left: 0;
    top: 0;
    pointer-events: auto;
  }

  .transformer__handle {
    position: absolute;
    height: 100%;
    width: 100%;
  }

  .transformer__handle--t,
  .transformer__handle--b {
    left: calc(var(--size) / 2);
    height: var(--size);
    width: calc(100% - var(--size));
    cursor: ns-resize;
  }

  .transformer__handle--t {
    top: calc(var(--size) / -2);
  }

  .transformer__handle--b {
    bottom: calc(var(--size) / -2);
  }

  .transformer__handle--t:before,
  .transformer__handle--b:before {
    content: '';
    position: absolute;
    top: 50%;
    width: 100%;
    height: 2px;
    background-color: var(--color);
  }

  .transformer__handle--l,
  .transformer__handle--r {
    top: calc(var(--size) / 2);
    width: var(--size);
    height: calc(100% - var(--size));
    cursor: ew-resize;
  }

  .transformer__handle--l {
    left: calc(var(--size) / -2);
  }

  .transformer__handle--r {
    right: calc(var(--size) / -2);
  }

  .transformer__handle--l:before,
  .transformer__handle--r:before {
    content: '';
    position: absolute;
    left: 50%;
    height: 100%;
    width: 2px;
    background-color: var(--color);
  }

  .transformer__handle--lt,
  .transformer__handle--rt {
    top: calc(var(--size) / -2);
    width: var(--size);
    height: var(--size);
    outline: var(--color) solid 2px;
  }

  .transformer__handle--lt {
    left: calc(var(--size) / -2);
    cursor: nwse-resize;
  }

  .transformer__handle--rt {
    right: calc(var(--size) / -2);
    cursor: nesw-resize;
  }

  .transformer__handle--lb,
  .transformer__handle--rb {
    bottom: calc(var(--size) / -2);
    width: var(--size);
    height: var(--size);
    outline: var(--color) solid 2px;
  }

  .transformer__handle--lb {
    left: calc(var(--size) / -2);
    cursor: nesw-resize;
  }

  .transformer__handle--rb {
    right: calc(var(--size) / -2);
    cursor: nwse-resize;
  }

  .transformer__handle--lt-r,
  .transformer__handle--rt-r {
    top: calc(var(--size) * -3);
    width: calc(var(--size) * 2);
    height: calc(var(--size) * 2);
  }

  .transformer__handle--lt-r {
    left: calc(var(--size) * -3);
    cursor: url("data:image/svg+xml,<svg height='32' width='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' style='color: black;'><defs><filter id='shadow' color-interpolation-filters='sRGB'><feDropShadow dx='1.017300101593673' dy='0.9823952887191097' stdDeviation='1.2' flood-opacity='.5'/></filter></defs><g fill='none' transform='rotate(0.9999999999998869 16 16)' filter='url(%23shadow)'><g><path d='M22.4789 9.45728L25.9935 12.9942L22.4789 16.5283V14.1032C18.126 14.1502 14.6071 17.6737 14.5675 22.0283H17.05L13.513 25.543L9.97889 22.0283H12.5674C12.6071 16.5691 17.0214 12.1503 22.4789 12.1031L22.4789 9.45728Z' fill='black'/><path fill-rule='evenodd' clip-rule='evenodd' d='M21.4789 7.03223L27.4035 12.9945L21.4789 18.9521V15.1868C18.4798 15.6549 16.1113 18.0273 15.649 21.0284H19.475L13.5128 26.953L7.55519 21.0284H11.6189C12.1243 15.8155 16.2679 11.6677 21.4789 11.1559L21.4789 7.03223ZM22.4789 12.1031C17.0214 12.1503 12.6071 16.5691 12.5674 22.0284H9.97889L13.513 25.543L17.05 22.0284H14.5675C14.5705 21.6896 14.5947 21.3558 14.6386 21.0284C15.1157 17.4741 17.9266 14.6592 21.4789 14.1761C21.8063 14.1316 22.1401 14.1069 22.4789 14.1032V16.5284L25.9935 12.9942L22.4789 9.45729L22.4789 12.1031Z' fill='white'/></g></g></svg>") 16 16, pointer;
  }

  .transformer__handle--rt-r {
    right: calc(var(--size) * -3);
    cursor: url("data:image/svg+xml,<svg height='32' width='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' style='color: black;'><defs><filter id='shadow' color-interpolation-filters='sRGB'><feDropShadow dx='0.9823952887191097' dy='-1.0173001015936727' stdDeviation='1.2' flood-opacity='.5'/></filter></defs><g fill='none' transform='rotate(90.99999999999989 16 16)' filter='url(%23shadow)'><g><path d='M22.4789 9.45728L25.9935 12.9942L22.4789 16.5283V14.1032C18.126 14.1502 14.6071 17.6737 14.5675 22.0283H17.05L13.513 25.543L9.97889 22.0283H12.5674C12.6071 16.5691 17.0214 12.1503 22.4789 12.1031L22.4789 9.45728Z' fill='black'/><path fill-rule='evenodd' clip-rule='evenodd' d='M21.4789 7.03223L27.4035 12.9945L21.4789 18.9521V15.1868C18.4798 15.6549 16.1113 18.0273 15.649 21.0284H19.475L13.5128 26.953L7.55519 21.0284H11.6189C12.1243 15.8155 16.2679 11.6677 21.4789 11.1559L21.4789 7.03223ZM22.4789 12.1031C17.0214 12.1503 12.6071 16.5691 12.5674 22.0284H9.97889L13.513 25.543L17.05 22.0284H14.5675C14.5705 21.6896 14.5947 21.3558 14.6386 21.0284C15.1157 17.4741 17.9266 14.6592 21.4789 14.1761C21.8063 14.1316 22.1401 14.1069 22.4789 14.1032V16.5284L25.9935 12.9942L22.4789 9.45729L22.4789 12.1031Z' fill='white'/></g></g></svg>") 16 16, pointer;
  }

  .transformer__handle--lb-r,
  .transformer__handle--rb-r {
    bottom: calc(var(--size) * -3);
    width: calc(var(--size) * 2);
    height: calc(var(--size) * 2);
  }

  .transformer__handle--lb-r {
    left: calc(var(--size) * -3);
    cursor: url("data:image/svg+xml,<svg height='32' width='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' style='color: black;'><defs><filter id='shadow' color-interpolation-filters='sRGB'><feDropShadow dx='-0.9823952887191099' dy='1.0173001015936727' stdDeviation='1.2' flood-opacity='.5'/></filter></defs><g fill='none' transform='rotate(270.9999999999999 16 16)' filter='url(%23shadow)'><g><path d='M22.4789 9.45728L25.9935 12.9942L22.4789 16.5283V14.1032C18.126 14.1502 14.6071 17.6737 14.5675 22.0283H17.05L13.513 25.543L9.97889 22.0283H12.5674C12.6071 16.5691 17.0214 12.1503 22.4789 12.1031L22.4789 9.45728Z' fill='black'/><path fill-rule='evenodd' clip-rule='evenodd' d='M21.4789 7.03223L27.4035 12.9945L21.4789 18.9521V15.1868C18.4798 15.6549 16.1113 18.0273 15.649 21.0284H19.475L13.5128 26.953L7.55519 21.0284H11.6189C12.1243 15.8155 16.2679 11.6677 21.4789 11.1559L21.4789 7.03223ZM22.4789 12.1031C17.0214 12.1503 12.6071 16.5691 12.5674 22.0284H9.97889L13.513 25.543L17.05 22.0284H14.5675C14.5705 21.6896 14.5947 21.3558 14.6386 21.0284C15.1157 17.4741 17.9266 14.6592 21.4789 14.1761C21.8063 14.1316 22.1401 14.1069 22.4789 14.1032V16.5284L25.9935 12.9942L22.4789 9.45729L22.4789 12.1031Z' fill='white'/></g></g></svg>") 16 16, pointer;
  }

  .transformer__handle--rb-r {
    right: calc(var(--size) * -3);
    cursor: url("data:image/svg+xml,<svg height='32' width='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' style='color: black;'><defs><filter id='shadow' color-interpolation-filters='sRGB'><feDropShadow dx='-1.0173001015936727' dy='-0.9823952887191099' stdDeviation='1.2' flood-opacity='.5'/></filter></defs><g fill='none' transform='rotate(180.9999999999999 16 16)' filter='url(%23shadow)'><g><path d='M22.4789 9.45728L25.9935 12.9942L22.4789 16.5283V14.1032C18.126 14.1502 14.6071 17.6737 14.5675 22.0283H17.05L13.513 25.543L9.97889 22.0283H12.5674C12.6071 16.5691 17.0214 12.1503 22.4789 12.1031L22.4789 9.45728Z' fill='black'/><path fill-rule='evenodd' clip-rule='evenodd' d='M21.4789 7.03223L27.4035 12.9945L21.4789 18.9521V15.1868C18.4798 15.6549 16.1113 18.0273 15.649 21.0284H19.475L13.5128 26.953L7.55519 21.0284H11.6189C12.1243 15.8155 16.2679 11.6677 21.4789 11.1559L21.4789 7.03223ZM22.4789 12.1031C17.0214 12.1503 12.6071 16.5691 12.5674 22.0284H9.97889L13.513 25.543L17.05 22.0284H14.5675C14.5705 21.6896 14.5947 21.3558 14.6386 21.0284C15.1157 17.4741 17.9266 14.6592 21.4789 14.1761C21.8063 14.1316 22.1401 14.1069 22.4789 14.1032V16.5284L25.9935 12.9942L22.4789 9.45729L22.4789 12.1031Z' fill='white'/></g></g></svg>") 16 16, pointer;
  }
</style>
