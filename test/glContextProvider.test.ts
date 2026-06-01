import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGlContextProvider, setGlContextProvider } from '../src'

describe('glContextProvider', () => {
  afterEach(() => setGlContextProvider(undefined))

  it('round-trips the provider through set/get', () => {
    const fn = vi.fn(() => undefined)
    setGlContextProvider(fn)
    expect(getGlContextProvider()).toBe(fn)
  })

  it('clears the provider when set to undefined', () => {
    setGlContextProvider(vi.fn(() => undefined))
    setGlContextProvider(undefined)
    expect(getGlContextProvider()).toBeUndefined()
  })

  it('passes the canvas and options through to the provider', () => {
    const fn = vi.fn(() => undefined)
    setGlContextProvider(fn)
    // call via the public surface: any user code obtains the provider and calls
    // it the same way WebGLRenderer does
    const opts: WebGLContextAttributes = { alpha: false, antialias: true }
    const fakeCanvas = { tagName: 'CANVAS' } as unknown as HTMLCanvasElement
    getGlContextProvider()!(fakeCanvas, opts)
    expect(fn).toHaveBeenCalledWith(fakeCanvas, opts)
  })
})
