import { EventEmitter } from '../object'
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

  protected _operate(
    operator: '+' | '-' | '*' | '/' | 'rot' | '==' | '=' | string,
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
          this._emitUpdate(array)
          return this
        default:
          throw new Error(`Not support operator in '${this.toName()} ${operator} Vector'`)
      }
    }

    return outputObject?.set(outputArray) ?? outputArray
  }

  add(value: VectorLike): this
  add<T extends VectorOperateOutput>(value: VectorLike, output: T): T
  add(value: any, output?: any): any { return this._operate('+', value, output) }

  sub(value: VectorLike): this
  sub<T extends VectorOperateOutput>(value: VectorLike, output: T): T
  sub(value: any, output?: any): any { return this._operate('-', value, output) }

  multiply(value: VectorLike): this
  multiply<T extends VectorOperateOutput>(value: VectorLike, output: T): T
  multiply(value: any, output?: any): any { return this._operate('*', value, output) }

  divide(value: VectorLike): this
  divide<T extends VectorOperateOutput>(value: VectorLike, output: T): T
  divide(value: any, output?: any): any { return this._operate('/', value, output) }

  rotate(angle: number): this
  rotate<T extends VectorOperateOutput>(angle: number, output: T): T
  rotate(angle: any): any { return this._operate('rot', angle) }

  set(value: VectorLike, ...args: number[]): this {
    if (args.length && typeof value === 'number') {
      value = [value, ...args]
    }
    return this._operate('=', value)
  }

  equals(value: VectorLike): boolean { return this._operate('==', value) }

  clone(): this {
    const cloned: this = new (this.constructor as any)()
    cloned.set(this.toArray())
    return cloned
  }

  onUpdate(callback: (array: number[]) => void): this {
    this.on('update', callback)
    return this
  }

  offUpdate(callback: (array: number[]) => void): this {
    this.off('update', callback)
    return this
  }

  protected _emitUpdate(array: number[]): void {
    this._onUpdate(array)
    this.emit('update', array)
  }

  protected _onUpdate(_array: number[]): void { /** override */ }

  toArray(): number[] {
    return this._array.slice()
  }

  toName(): string {
    return `Vector${this.dim}`
  }
}
