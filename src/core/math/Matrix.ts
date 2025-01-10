import { EventEmitter } from '../object'
import { Vector } from './Vector'

export type MatrixLike = number | number[] | Matrix
export type MatrixOperateOutput = number[] | Matrix | Vector

export abstract class Matrix extends EventEmitter {
  protected _array: number[] = []

  get length(): number { return this.cols * this.rows }

  constructor(
    readonly rows: number,
    readonly cols: number,
    array?: number[],
  ) {
    super()
    if (array) {
      this.set(array)
    }
    else {
      this.identity()
    }
  }

  protected _operate(
    operator: string,
    target: MatrixLike | Vector,
    output?: MatrixOperateOutput,
  ): any {
    const { cols, rows, length, _array: array } = this

    let targetArray: number[]
    if (typeof target === 'number') {
      targetArray = Array.from({ length }, () => target)
    }
    else if (target instanceof Vector || target instanceof Matrix) {
      targetArray = target.toArray()
    }
    else {
      targetArray = target
    }

    let outputObject: Vector | Matrix | undefined
    let outputArray: number[] = []
    if (!output) {
      if (target instanceof Vector) {
        outputObject = (new (target.constructor as any)()) as Vector
      }
      else {
        outputObject = this as any
      }
    }
    else if (output instanceof Vector) {
      outputObject = output
    }
    else if (output instanceof Matrix) {
      outputObject = output
    }
    else {
      outputArray = output
    }

    if (target instanceof Vector) {
      const { dim } = target

      switch (operator) {
        case '*':
          for (let y = 0; y < dim; y++) {
            let sum = 0
            for (let i = 0; i < cols; i++) {
              if (i < dim) {
                sum += array[y * cols + i] * (targetArray[i] ?? 0)
              }
            }
            outputArray[y] = sum
          }
          break
        default:
          throw new Error(`Not support operator in '${this.toName()} ${operator} ${target.toName()}'`)
      }
    }
    else {
      switch (operator) {
        case '*':
          for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
              const iy = y * cols
              let sum = 0
              for (let i = 0; i < rows; i++) {
                const a = iy + i
                const b = i * cols + x
                sum += array[a] * (targetArray[b] ?? 0)
              }
              outputArray[iy + x] = sum
            }
          }
          break
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
          throw new Error(`Not support operator in '${this.toName()} ${operator} Matrix2'`)
      }
    }

    return outputObject?.set(outputArray) ?? outputArray
  }

  identity(): this {
    const { cols, rows } = this
    const array = []
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const iy = y * cols
        const i = x + iy
        array[i] = y + iy === i ? 1 : 0
      }
    }
    return this.set(array)
  }

  clone(): this {
    const cloned: this = new (this.constructor as any)()
    cloned.set(this.toArray())
    return cloned
  }

  set(value: MatrixLike): this { return this._operate('=', value) as this }

  multiply<T extends Vector>(value: T): T
  multiply(value: MatrixLike): this
  multiply<T extends MatrixOperateOutput>(value: MatrixLike, output: T): T
  multiply(value: any): any { return this._operate('*', value) }

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

  toArray(transpose = false): number[] {
    const { cols, rows, _array: array } = this
    if (transpose) {
      const newArray: number[] = []
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          newArray[y + x * cols] = array[x + y * cols]
        }
      }
      return newArray
    }
    return array.slice()
  }

  toName(): string { return `Matrix${this.rows}(${this.rows}x${this.cols})` }
  toJSON(): number[] { return this._array }
}
