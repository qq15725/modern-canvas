import { EventEmitter } from 'modern-idoc'
import { Matrix } from './Matrix'

export type VectorLike = number | number[] | Matrix | Vector
export type VectorOperateOutput = number[] | Vector

export abstract class Vector extends EventEmitter {
  protected _array: number[] = []

  get length(): number { return this.dim }

  constructor(
    readonly dim: number,
  ) {
    super()
  }

  operate(
    operator: '+' | '-' | '*' | '/' | 'rot' | '==' | '=',
    target: VectorLike,
    output?: VectorOperateOutput,
  ): any {
    const { dim: length, _array: array } = this

    let targetArray: number[]
    if (typeof target === 'number') {
      targetArray = Array.from({ length }, () => target)
    }
    else if (target instanceof Matrix || target instanceof Vector) {
      targetArray = target.toArray()
    }
    else {
      targetArray = target
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

    if (target instanceof Matrix) {
      const { cols } = target
      switch (operator) {
        case '*':
          for (let x = 0; x < length; x++) {
            let val = 0
            for (let y = 0; y < length; y++) {
              val += array[x] * targetArray[y * cols + x]
            }
            outputArray[x] = val
          }
          break
        default:
          throw new Error(`Not support operator in '${this.toName()} ${operator} ${target.toName()}'`)
      }
    }
    else {
      switch (operator) {
        case '+':
          for (let i = 0; i < length; i++) {
            outputArray[i] = array[i] + targetArray[i]
          }
          break
        case '-':
          for (let i = 0; i < length; i++) {
            outputArray[i] = array[i] - targetArray[i]
          }
          break
        case '*':
          for (let i = 0; i < length; i++) {
            outputArray[i] = array[i] * targetArray[i]
          }
          break
        case '/':
          for (let i = 0; i < length; i++) {
            outputArray[i] = array[i] / targetArray[i]
          }
          break
        case 'rot': {
          const c = Math.cos(targetArray[0])
          const s = Math.sin(targetArray[0])
          outputArray[0] = array[0] * c - array[1] * s
          outputArray[1] = array[1] * c + array[0] * s
          break
        }
        case '==': {
          let flag = true
          for (let i = 0; i < length; i++) {
            flag = flag && array[i] === targetArray[i]
          }
          return flag
        }
        case '=':
          for (let i = 0; i < length; i++) {
            const val = targetArray[i]
            if (val !== undefined) {
              array[i] = val
            }
          }
          this._onUpdate(array)
          this.emit('update', array)
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
    return `Vector${this.dim}`
  }

  toArray(): number[] {
    return this._array.slice()
  }

  toJSON(): number[] {
    return this.toArray()
  }
}
