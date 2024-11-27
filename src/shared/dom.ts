export const SUPPORTS_WEBGL2 = 'WebGL2RenderingContext' in globalThis
export const SUPPORTS_IMAGE_BITMAP = 'ImageBitmap' in globalThis
export const SUPPORTS_RESIZE_OBSERVER = 'ResizeObserver' in globalThis
export const SUPPORTS_POINTER_EVENTS = 'PointerEvent' in globalThis
export const SUPPORTS_WHEEL_EVENTS = 'WheelEvent' in globalThis
export const SUPPORTS_MOUSE_EVENTS = 'MouseEvent' in globalThis
export const SUPPORTS_TOUCH_EVENTS = 'ontouchstart' in globalThis
export const SUPPORTS_CLICK_EVENTS = 'onclick' in globalThis
export const SUPPORTS_CREATE_IMAGE_BITMAP = 'createImageBitmap' in globalThis
export const SUPPORTS_AUDIO_CONTEXT = 'AudioContext' in globalThis
export const SUPPORTS_WEBKIT_AUDIO_CONTEXT = 'webkitAudioContext' in globalThis
export const SUPPORTS_OFFLINE_AUDIO_CONTEXT = 'OfflineAudioContext' in globalThis
export const SUPPORTS_WEBKIT_OFFLINE_AUDIO_CONTEXT = 'webkitOfflineAudioContext' in globalThis
export const SUPPORTS_WEB_AUDIO = SUPPORTS_AUDIO_CONTEXT || SUPPORTS_WEBKIT_AUDIO_CONTEXT

export const IN_BROWSER = typeof window !== 'undefined'
export const DEVICE_PIXEL_RATIO = globalThis.devicePixelRatio || 1

export const isElementNode = (node: unknown): node is Element => node !== null && typeof node === 'object' && (node as any).nodeType === 1 // Node.ELEMENT_NODE
export const isVideoElement = (node: unknown): node is HTMLVideoElement => isElementNode(node) && node.tagName === 'VIDEO'
export const isImageElement = (node: unknown): node is HTMLImageElement => isElementNode(node) && node.tagName === 'IMG'
export function isCanvasElement(node: unknown): node is HTMLCanvasElement {
  return typeof node === 'object'
    && node !== null
    && (node as any).nodeType === 1
    && (node as any).tagName === 'CANVAS'
}
export function isWebgl2(gl: unknown): gl is WebGL2RenderingContext {
  return SUPPORTS_WEBGL2
    && gl instanceof globalThis.WebGL2RenderingContext
}
export function createHTMLCanvas(): HTMLCanvasElement | undefined {
  if (IN_BROWSER) {
    return globalThis.document.createElement('canvas')
  }
  return undefined
}

export function determineCrossOrigin(
  url: string,
  loc: Location = globalThis.location,
): string {
  // data: and javascript: urls are considered same-origin
  if (url.startsWith('data:')) {
    return ''
  }
  // default is window.location
  loc = loc || globalThis.location
  const parsedUrl = new URL(url, document.baseURI)
  // if cross origin
  if (parsedUrl.hostname !== loc.hostname || parsedUrl.port !== loc.port || parsedUrl.protocol !== loc.protocol) {
    return 'anonymous'
  }
  return ''
}

export function crossOrigin(
  element: HTMLImageElement | HTMLVideoElement,
  url: string,
  crossorigin: boolean | string | null,
): void {
  if (crossorigin === null && !url.startsWith('data:')) {
    element.crossOrigin = determineCrossOrigin(url)
  }
  else if (crossorigin !== false) {
    element.crossOrigin = typeof crossorigin === 'string' ? crossorigin : 'anonymous'
  }
}
