import { afterEach, describe, expect, it } from 'vitest'
import { Engine, setGlContextProvider } from '../src'

// The Engine → WebGLRenderer context-attribute plumbing once merged options
// backwards (`defaultOptions.x ?? properties.x`), silently discarding every
// user-provided attribute. These tests pin the fixed precedence by capturing
// what actually reaches getContext via a provider that supplies no GL — the
// constructor then throws, which is fine: only the options matter here.

describe('engine context attributes', () => {
  afterEach(() => setGlContextProvider(undefined))

  function captureOptions(properties: Record<string, any>): WebGLContextAttributes | undefined {
    let captured: WebGLContextAttributes | undefined
    setGlContextProvider((_canvas, options) => {
      captured = options
      return undefined
    })
    const view = { nodeType: 1, tagName: 'CANVAS', dataset: {}, getContext: () => null } as any
    expect(() => new Engine({ view, ...properties })).toThrow('Unable to getContext')
    return captured
  }

  it('user-provided attributes win over the defaults', () => {
    const captured = captureOptions({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
    expect(captured?.antialias).toBe(true)
    expect(captured?.preserveDrawingBuffer).toBe(true)
    expect(captured?.powerPreference).toBe('high-performance')
  })

  it('defaults fill the attributes the user leaves unset', () => {
    const captured = captureOptions({ antialias: true })
    expect(captured?.stencil).toBe(true)
    expect(captured?.premultipliedAlpha).toBe(true)
    expect(captured?.alpha).toBe(true)
    expect(captured?.preserveDrawingBuffer).toBe(false)
  })
})
