type ExtendableTypes = 'Element' | 'Text'

export interface CustomTypes {
  [key: string]: unknown
}

export type ExtendedType<K extends ExtendableTypes, B> = unknown extends CustomTypes[K] ? B : CustomTypes[K]

export interface BaseNode {
  type: string
  x: number
  y: number
  w: number
  h: number
  [key: string]: any
}

export interface BaseElement extends BaseNode {
  children: Node[]
}
export type Element = ExtendedType<'Element', BaseElement>

export interface BaseText extends BaseNode {
  content: string
}
export type Text = ExtendedType<'Text', BaseText>

export type Node = Element | Text
