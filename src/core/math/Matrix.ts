import type { TypedArray } from '../renderers'
import type { Vector } from './Vector'
import { Observable } from 'modern-idoc'

export type MatrixLike = number | number[] | TypedArray | Matrix
export type MatrixOperateOutput = number[] | Matrix | Vector

const cached = new Map<string, number[]>()
function getIdentityArray(rows: number, cols: number): number[] {
  const key = `${rows}x${cols}`
  let arr = cached.get(key)
  if (!arr) {
    arr = Array.from({ length: rows * cols }) as number[]
    let x, y, ix, iy
    for (x = 0; x < cols; x++) {
      for (y = 0; y < rows; y++) {
        iy = y * cols
        ix = x + iy
        arr[ix] = y + iy === ix ? 1 : 0
      }
    }
    cached.set(key, arr)
  }
  return arr
}

export abstract class Matrix extends Observable {
  readonly __matrix = true

  _array: number[]
  dirtyId = 0
  readonly length: number

  constructor(
    readonly rows: number,
    readonly cols: number,
    array?: number[],
  ) {
    super()

    this.length = cols * rows
    this._array = Array.from({ length: this.length }).fill(0) as number[]

    if (array) {
      this.set(array)
    }
    else {
      this.identity()
    }
  }

  operate(
    operator: string,
    target: MatrixLike | Vector,
    output?: MatrixOperateOutput,
  ): any {
    const { cols, rows, length, _array } = this

    const isNumber = typeof target === 'number'
    const isMatrix = !isNumber && Boolean((target as any).__matrix)
    const isVector = !isNumber && Boolean((target as any).__vector)

    let targetArray: number[] | TypedArray
    if (isNumber) {
      targetArray = new Float64Array(length).fill(target as number)
    }
    else if (isMatrix || isVector) {
      targetArray = (target as Vector | Matrix)._array
    }
    else {
      targetArray = target as any
    }

    let outputObject: Vector | Matrix | undefined
    let outputArray: number[] = []
    if (!output) {
      if (isVector) {
        outputObject = (new (target.constructor as any)()) as Vector
      }
      else {
        outputObject = this as any
      }
    }
    else if (isVector || isMatrix) {
      outputObject = output as Vector | Matrix
    }
    else {
      outputArray = output as any
    }

    if (isVector) {
      const { length: dim } = target as Vector

      switch (operator) {
        case '*': {
          let y, i, sum
          for (y = 0; y < dim; y++) {
            sum = 0
            for (i = 0; i < cols; i++) {
              if (i < dim) {
                sum += _array[y * cols + i] * (targetArray[i] ?? 0)
              }
            }
            outputArray[y] = sum
          }
          break
        }
        default:
          throw new Error(`Not support operator in '${this.toName()} ${operator} ${target}'`)
      }
    }
    else {
      switch (operator) {
        case '*': {
          let x, y, iy, sum
          for (x = 0; x < cols; x++) {
            for (y = 0; y < rows; y++) {
              iy = y * cols
              sum = 0
              for (let i = 0; i < rows; i++) {
                sum += _array[iy + i] * (targetArray[i * cols + x] ?? 0)
              }
              outputArray[iy + x] = sum
            }
          }
          break
        }
        default:
          throw new Error(`Not support operator in '${this.toName()} ${operator} Matrix2'`)
      }
    }

    return outputObject?.set(outputArray) ?? outputArray
  }

  identity(): this {
    return this.set(getIdentityArray(this.rows, this.cols))
  }

  set(array: ArrayLike<number>): this {
    for (let i = 0; i < this.length; i++) {
      this._array[i] = array[i]
    }
    this._onUpdate(this._array)
    this.emit('update', this._array)
    return this
  }

  copy(value: Matrix): this {
    return this.set(value._array)
  }

  clone(): this {
    const cloned: this = new (this.constructor as any)()
    cloned.set(this.toArray())
    return cloned
  }

  multiply<T extends Vector>(value: T): T
  multiply(value: MatrixLike): this
  multiply<T extends MatrixOperateOutput>(value: MatrixLike, output: T): T
  multiply(value: any, output?: any): any {
    return this.operate('*', value, output)
  }

  protected _onUpdate(_array: number[]): void {
    this.dirtyId++
  }

  toArray(transpose = false): number[] {
    const { cols, rows, _array } = this
    if (transpose) {
      const newArray: number[] = []
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          newArray[y + x * cols] = _array[x + y * cols]
        }
      }
      return newArray
    }
    return [..._array]
  }

  toTypedArray(): Float64Array<ArrayBuffer> {
    return new Float64Array(this._array)
  }

  toName(): string {
    return `Matrix${this.rows}(${this.rows}x${this.cols})`
  }

  toJSON(): number[] {
    return this.toArray()
  }
}
