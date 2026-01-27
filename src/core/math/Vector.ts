import type { TypedArray } from '../renderers'
import type { Matrix } from './Matrix'
import { Observable } from 'modern-idoc'

export type VectorLike = number | number[] | Matrix | Vector
export type VectorOperateOutput = number[] | Vector

export abstract class Vector extends Observable {
  readonly __vector = true

  _array: number[]

  constructor(
    readonly length: number,
  ) {
    super()

    this._array = Array.from({ length }).fill(0) as number[]
  }

  operate(
    operator: '+' | '-' | '*' | '/' | 'rot' | '==' | '=',
    target: VectorLike,
    output?: VectorOperateOutput,
  ): any {
    const { length, _array } = this

    const isNumber = typeof target === 'number'
    const isMatrix = !isNumber && Boolean((target as any).__matrix)
    const isVector = !isNumber && Boolean((target as any).__vector)

    let targetArray: number[] | TypedArray
    if (isNumber) {
      targetArray = new Float64Array(length).fill(target as number)
    }
    else if (isMatrix || isVector) {
      targetArray = (target as Matrix | Vector)._array
    }
    else {
      targetArray = target as any
    }

    let outputObject: Vector | undefined
    let outputArray: number[] = []
    if (!output) {
      outputObject = this as any
    }
    else if (output instanceof Vector) {
      outputObject = output
    }
    else {
      outputArray = output
    }

    if (isMatrix) {
      const { cols } = target as Matrix
      switch (operator) {
        case '*':
          for (let x = 0; x < length; x++) {
            let val = 0
            for (let y = 0; y < length; y++) {
              val += _array[x] * targetArray[y * cols + x]
            }
            outputArray[x] = val
          }
          break
        default:
          throw new Error(`Not support operator in '${this.toName()} ${operator} ${target}'`)
      }
    }
    else {
      switch (operator) {
        case '+':
          for (let i = 0; i < length; i++) {
            outputArray[i] = _array[i] + targetArray[i]
          }
          break
        case '-':
          for (let i = 0; i < length; i++) {
            outputArray[i] = _array[i] - targetArray[i]
          }
          break
        case '*':
          for (let i = 0; i < length; i++) {
            outputArray[i] = _array[i] * targetArray[i]
          }
          break
        case '/':
          for (let i = 0; i < length; i++) {
            outputArray[i] = _array[i] / targetArray[i]
          }
          break
        case 'rot': {
          const c = Math.cos(targetArray[0])
          const s = Math.sin(targetArray[0])
          outputArray[0] = _array[0] * c - _array[1] * s
          outputArray[1] = _array[1] * c + _array[0] * s
          break
        }
        case '==': {
          let flag = true
          for (let i = 0; i < length; i++) {
            flag = flag && _array[i] === targetArray[i]
          }
          return flag
        }
        case '=':
          for (let i = 0; i < length; i++) {
            if (targetArray[i] !== undefined) {
              _array[i] = targetArray[i]
            }
          }
          this._onUpdate(_array)
          this.emit('update', _array)
          return this
        default:
          throw new Error(`Not support operator in '${this.toName()} ${operator} Vector'`)
      }
    }

    return outputObject?.set(outputArray) ?? outputArray
  }

  add(value: VectorLike, ...args: number[]): this {
    if (args.length && typeof value === 'number') {
      value = [value, ...args]
    }
    return this.operate('+', value)
  }

  sub(value: VectorLike, ...args: number[]): this {
    if (args.length && typeof value === 'number') {
      value = [value, ...args]
    }
    return this.operate('-', value)
  }

  multiply(value: VectorLike, ...args: number[]): this {
    if (args.length && typeof value === 'number') {
      value = [value, ...args]
    }
    return this.operate('*', value)
  }

  divide(value: VectorLike, ...args: number[]): this {
    if (args.length && typeof value === 'number') {
      value = [value, ...args]
    }
    return this.operate('/', value)
  }

  rotate(angle: number): this {
    return this.operate('rot', angle)
  }

  set(value: VectorLike, ...args: number[]): this {
    if (args.length && typeof value === 'number') {
      value = [value, ...args]
    }
    return this.operate('=', value)
  }

  equals(value: VectorLike): boolean {
    return this.operate('==', value)
  }

  copy(value: VectorLike): this {
    return this.set(value)
  }

  clone(): this {
    const cloned: this = new (this.constructor as any)()
    cloned.set(this.toArray())
    return cloned
  }

  protected _onUpdate(_array: number[]): void { /** override */ }

  toName(): string {
    return `Vector${this.length}`
  }

  toArray(): number[] {
    return [...this._array]
  }

  toTypedArray(): Float64Array<ArrayBuffer> {
    return new Float64Array(this._array)
  }

  toJSON(): number[] {
    return this.toArray()
  }
}
