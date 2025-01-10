import type { PropertyDeclaration } from './property'
import { property } from './property'

export function protectedProperty(options?: Omit<PropertyDeclaration, 'protected'>): PropertyDecorator {
  return property({ ...options, protected: true })
}
