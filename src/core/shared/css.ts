import { PI_2 } from './utils'

export interface CssFunctionArg {
  unit: string | null
  value: string
  intValue: number
  normalizedIntValue: number
  normalizedDefaultIntValue: number
}

export interface CssFunction {
  name: string
  args: CssFunctionArg[]
}

interface ParseArgumentContext {
  index?: number
  fontSize?: number
  width?: number
  height?: number
}

const FUNCTIONS_RE = /([\w-]+)\((.+?)\)/g
const ARGS_RE = /[^,]+/g
const ARG_RE = /([-e.\d]+)(.*)/

export function getDefaultCssPropertyValue<T extends CssFunctionArg | CssFunction[]>(
  value: T,
): T {
  if (Array.isArray(value)) {
    return value.map((func) => {
      return {
        name: func.name,
        args: func.args.map((arg) => {
          return {
            ...arg,
            normalizedIntValue: arg.normalizedDefaultIntValue,
          }
        }),
      }
    }) as any
  }
  else {
    return {
      ...value,
      normalizedIntValue: value.normalizedDefaultIntValue,
    }
  }
}

export function parseCssProperty(
  name: string,
  propertyValue: string,
  context: ParseArgumentContext = {},
): CssFunctionArg | CssFunction[] {
  const functions = parseCssFunctions(propertyValue, context)
  return functions.length
    ? functions
    : parseArgument(name, propertyValue, context)
}

export function parseCssFunctions(
  propertyValue: string,
  context: ParseArgumentContext = {},
): CssFunction[] {
  const functions = []
  let match: RegExpExecArray | null | undefined

  // eslint-disable-next-line no-cond-assign
  while ((match = FUNCTIONS_RE.exec(propertyValue)) !== null) {
    const [, name, value] = match
    if (name) {
      functions.push({
        name,
        args: parseArguments(name, value, context),
      })
    }
  }
  return functions
}

function parseArguments(name: string, value: string, context: ParseArgumentContext = {}): CssFunctionArg[] {
  const values = []
  let match: RegExpExecArray | null | undefined
  let i = 0

  // eslint-disable-next-line no-cond-assign
  while ((match = ARGS_RE.exec(value)) !== null) {
    values.push(
      parseArgument(name, match[0], {
        ...context,
        index: i++,
      }),
    )
  }
  return values
}

function parseArgument(name: string, value: string, context: ParseArgumentContext = {}): CssFunctionArg {
  const { width = 1, height = 1, index = 0 } = context
  const matched = value.match(ARG_RE)
  const result = {
    unit: matched?.[2] ?? null,
    value,
    intValue: Number(matched?.[1]),
    normalizedIntValue: 0,
    normalizedDefaultIntValue: 0,
  }

  switch (name) {
    case 'scale':
    case 'scaleX':
    case 'scaleY':
    case 'scale3d':
      result.normalizedDefaultIntValue = 1
      break
  }

  switch (result.unit) {
    case '%':
      result.normalizedIntValue = result.intValue / 100
      break
    case 'rad':
      result.normalizedIntValue = result.intValue / PI_2
      break
    case 'deg':
      result.normalizedIntValue = result.intValue / 360
      break
    case 'px':
      switch (index) {
        case 0:
          result.normalizedIntValue = result.intValue / width
          break
        case 1:
          result.normalizedIntValue = result.intValue / height
          break
      }
      break
    case 'turn':
    case 'em': // div fontSize
    case 'rem': // div fontSize
    default:
      result.normalizedIntValue = result.intValue
      break
  }

  return result
}
