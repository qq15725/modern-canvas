import { describe, expect, it } from 'vitest'
import { GlBatch2DSystem } from '../src/core/renderers/gl/GlBatch2DSystem'
import { GlTexture } from '../src/core/renderers/gl/texture/GlTexture'
import { GlTextureSystem } from '../src/core/renderers/gl/texture/GlTextureSystem'
import { getFillDrawOptions } from '../src/scene/2d/element/utils'

describe('图片采样隔离', () => {
  it('普通图片和裁剪钳制边缘，平铺保留重复采样', () => {
    const rect = { x: 0, y: 0, width: 100, height: 100 }
    expect(getFillDrawOptions({}, rect).clampTexture).toBe(true)
    expect(getFillDrawOptions({ cropRect: {} }, rect).clampTexture).toBe(true)
    expect(getFillDrawOptions({ stretchRect: {} }, rect).clampTexture).toBe(true)
    expect(getFillDrawOptions({ tile: {} }, rect).clampTexture).toBe(false)
    // cropRect 与 tile 同时出现时，保持原有的 cropRect 优先级。
    expect(getFillDrawOptions({ cropRect: {}, tile: {} }, rect).clampTexture).toBe(true)
  })

  it('同一图片按普通、平铺、普通顺序分批，缓存帧也保留采样方式', () => {
    const sys = new GlBatch2DSystem() as any
    sys._renderer = {
      texture: { maxTextureImageUnits: 8 },
      geometry: { unbind() {} },
      buffer: { update() {} },
    }
    sys._getProgram = () => ({})
    let calls: any[] = []
    sys._issueDrawCalls = (_program: any, slot: any) => {
      calls = slot.drawCalls
    }
    const texture: any = { instanceId: 1 }
    const items = [true, false, true].map(clampTexture => ({
      texture,
      clampTexture,
      vertices: new Float32Array([0, 0, 10, 0, 0, 10]),
      indices: new Uint32Array([0, 1, 2]),
    }))
    const draw = () => {
      sys.beginFrame()
      items.forEach(item => sys.render(item))
      sys.flush()
    }
    draw()
    expect(calls.map(c => [c.start, c.size, c.textureClampMap.get(texture)])).toEqual([[0, 3, true], [3, 3, false], [6, 3, true]])
    draw()
    expect(calls.map(c => c.textureClampMap.get(texture))).toEqual([true, false, true])
    items[1].clampTexture = true
    draw()
    expect(calls.map(c => [c.size, c.textureClampMap.get(texture)])).toEqual([[9, true]])
    items[1].texture = { instanceId: 2 }
    items[1].clampTexture = false
    draw()
    expect(calls).toHaveLength(1)
    expect([...calls[0].textureClampMap.values()]).toEqual([true, false])
  })

  it('切换纹理单元和采样方式不修改共享资源，下一次普通 bind 恢复原设置', () => {
    let active = 0
    const bound = new Map<number, any>()
    const wraps = new Map<any, Map<number, number>>()
    const gl = {
      TEXTURE0: 33984, TEXTURE_2D: 3553, TEXTURE_WRAP_S: 10242, TEXTURE_WRAP_T: 10243,
      TEXTURE_MAG_FILTER: 10240, TEXTURE_MIN_FILTER: 10241,
      activeTexture(unit: number) { active = unit - this.TEXTURE0 },
      bindTexture(_target: number, native: any) { bound.set(active, native) },
      texParameteri(_target: number, parameter: number, value: number) {
        const native = bound.get(active)
        if (!wraps.has(native))
          wraps.set(native, new Map())
        wraps.get(native)!.set(parameter, value)
      },
    }
    const sys = new GlTextureSystem() as any
    sys._renderer = { gl, supports: { nonPowOf2wrapping: true }, extensions: {} }
    const a: any = { instanceId: 1, addressModeU: 'repeat', addressModeV: 'repeat' }
    const b: any = { instanceId: 2, addressModeU: 'repeat', addressModeV: 'repeat' }
    sys.glTextures.set(1, new GlTexture(a))
    sys.glTextures.set(2, new GlTexture(b))
    sys.bind(a, 0, true)
    sys.bind(b, 1, true)
    sys.bind(a, 0, false)
    expect(wraps.get(a)?.get(gl.TEXTURE_WRAP_T)).toBe(10497)
    expect(wraps.get(b)?.get(gl.TEXTURE_WRAP_T)).toBe(33071)
    expect(a.addressModeV).toBe('repeat')
    sys.bind(a, 0, true)
    sys.bind(a)
    expect(wraps.get(a)?.get(gl.TEXTURE_WRAP_T)).toBe(10497)
    // 更新 A 的属性时 B 正被绑定，不能把 A 的参数误写到 B。
    sys.bind(b, 1)
    a.addressModeV = 'clamp-to-edge'
    sys.updateStyle(a)
    expect(wraps.get(a)?.get(gl.TEXTURE_WRAP_T)).toBe(33071)
    expect(wraps.get(b)?.get(gl.TEXTURE_WRAP_T)).toBe(10497)
  })
})
