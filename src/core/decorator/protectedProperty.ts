import type { PropertyDeclaration } from 'modern-idoc'
import { property } from 'modern-idoc'

export function protectedProperty(options?: Omit<PropertyDeclaration, 'protected'>): PropertyDecorator {
  return property({ ...options, protected: true })
}
