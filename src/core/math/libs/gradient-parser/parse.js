/* eslint-disable */
// @ts-nocheck

// Copyright (c) 2014 Rafael Caricio. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var GradientParser = (GradientParser || {})

GradientParser.parse = (function () {
  const tokens = {
    linearGradient: /^(-(webkit|o|ms|moz)-)?(linear-gradient)/i,
    repeatingLinearGradient: /^(-(webkit|o|ms|moz)-)?(repeating-linear-gradient)/i,
    radialGradient: /^(-(webkit|o|ms|moz)-)?(radial-gradient)/i,
    repeatingRadialGradient: /^(-(webkit|o|ms|moz)-)?(repeating-radial-gradient)/i,
    sideOrCorner: /^to (left (top|bottom)|right (top|bottom)|top (left|right)|bottom (left|right)|left|right|top|bottom)/i,
    extentKeywords: /^(closest-side|closest-corner|farthest-side|farthest-corner|contain|cover)/,
    positionKeywords: /^(left|center|right|top|bottom)/i,
    pixelValue: /^(-?((\d*\.\d+)|(\d+\.?)))px/,
    percentageValue: /^(-?((\d*\.\d+)|(\d+\.?)))%/,
    emValue: /^(-?((\d*\.\d+)|(\d+\.?)))em/,
    angleValue: /^(-?((\d*\.\d+)|(\d+\.?)))deg/,
    radianValue: /^(-?((\d*\.\d+)|(\d+\.?)))rad/,
    startCall: /^\(/,
    endCall: /^\)/,
    comma: /^,/,
    hexColor: /^#([0-9a-f]+)/i,
    literalColor: /^([a-z]+)/i,
    rgbColor: /^rgb/i,
    rgbaColor: /^rgba/i,
    varColor: /^var/i,
    calcValue: /^calc/i,
    variableName: /^(--[a-z0-9-,\s#]+)/i,
    number: /^((\d*\.\d+)|(\d+\.?))/,
    hslColor: /^hsl/i,
    hslaColor: /^hsla/i,
  }

  let input = ''

  function error(msg) {
    const err = new Error(`${input}: ${msg}`)
    err.source = input
    throw err
  }

  function getAST() {
    const ast = matchListDefinitions()

    if (input.length > 0) {
      error('Invalid input not EOF')
    }

    return ast
  }

  function matchListDefinitions() {
    return matchListing(matchDefinition)
  }

  function matchDefinition() {
    return matchGradient(
      'linear-gradient',
      tokens.linearGradient,
      matchLinearOrientation)

    || matchGradient(
      'repeating-linear-gradient',
      tokens.repeatingLinearGradient,
      matchLinearOrientation)

    || matchGradient(
      'radial-gradient',
      tokens.radialGradient,
      matchListRadialOrientations)

    || matchGradient(
      'repeating-radial-gradient',
      tokens.repeatingRadialGradient,
      matchListRadialOrientations)
  }

  function matchGradient(gradientType, pattern, orientationMatcher) {
    return matchCall(pattern, (captures) => {
      const orientation = orientationMatcher()
      if (orientation) {
        if (!scan(tokens.comma)) {
          error('Missing comma before color stops')
        }
      }

      return {
        type: gradientType,
        orientation,
        colorStops: matchListing(matchColorStop),
      }
    })
  }

  function matchCall(pattern, callback) {
    const captures = scan(pattern)

    if (captures) {
      if (!scan(tokens.startCall)) {
        error('Missing (')
      }

      const result = callback(captures)

      if (!scan(tokens.endCall)) {
        error('Missing )')
      }

      return result
    }
  }

  function matchLinearOrientation() {
    // Check for standard CSS3 "to" direction
    const sideOrCorner = matchSideOrCorner()
    if (sideOrCorner) {
      return sideOrCorner
    }

    // Check for legacy single keyword direction (e.g., "right", "top")
    const legacyDirection = match('position-keyword', tokens.positionKeywords, 1)
    if (legacyDirection) {
      // For legacy syntax, we convert to the directional type
      return {
        type: 'directional',
        value: legacyDirection.value,
      }
    }

    // If neither, check for angle
    return matchAngle()
  }

  function matchSideOrCorner() {
    return match('directional', tokens.sideOrCorner, 1)
  }

  function matchAngle() {
    return match('angular', tokens.angleValue, 1)
      || match('angular', tokens.radianValue, 1)
  }

  function matchListRadialOrientations() {
    let radialOrientations
    let radialOrientation = matchRadialOrientation()
    let lookaheadCache

    if (radialOrientation) {
      radialOrientations = []
      radialOrientations.push(radialOrientation)

      lookaheadCache = input
      if (scan(tokens.comma)) {
        radialOrientation = matchRadialOrientation()
        if (radialOrientation) {
          radialOrientations.push(radialOrientation)
        }
        else {
          input = lookaheadCache
        }
      }
    }

    return radialOrientations
  }

  function matchRadialOrientation() {
    let radialType = matchCircle()
      || matchEllipse()

    if (radialType) {
      radialType.at = matchAtPosition()
    }
    else {
      const extent = matchExtentKeyword()
      if (extent) {
        radialType = extent
        const positionAt = matchAtPosition()
        if (positionAt) {
          radialType.at = positionAt
        }
      }
      else {
        // Check for "at" position first, which is a common browser output format
        const atPosition = matchAtPosition()
        if (atPosition) {
          radialType = {
            type: 'default-radial',
            at: atPosition,
          }
        }
        else {
          const defaultPosition = matchPositioning()
          if (defaultPosition) {
            radialType = {
              type: 'default-radial',
              at: defaultPosition,
            }
          }
        }
      }
    }

    return radialType
  }

  function matchCircle() {
    const circle = match('shape', /^(circle)/i, 0)

    if (circle) {
      circle.style = matchLength() || matchExtentKeyword()
    }

    return circle
  }

  function matchEllipse() {
    const ellipse = match('shape', /^(ellipse)/i, 0)

    if (ellipse) {
      ellipse.style = matchPositioning() || matchDistance() || matchExtentKeyword()
    }

    return ellipse
  }

  function matchExtentKeyword() {
    return match('extent-keyword', tokens.extentKeywords, 1)
  }

  function matchAtPosition() {
    if (match('position', /^at/, 0)) {
      const positioning = matchPositioning()

      if (!positioning) {
        error('Missing positioning value')
      }

      return positioning
    }
  }

  function matchPositioning() {
    const location = matchCoordinates()

    if (location.x || location.y) {
      return {
        type: 'position',
        value: location,
      }
    }
  }

  function matchCoordinates() {
    return {
      x: matchDistance(),
      y: matchDistance(),
    }
  }

  function matchListing(matcher) {
    let captures = matcher()
    const result = []

    if (captures) {
      result.push(captures)
      while (scan(tokens.comma)) {
        captures = matcher()
        if (captures) {
          result.push(captures)
        }
        else {
          error('One extra comma')
        }
      }
    }

    return result
  }

  function matchColorStop() {
    const color = matchColor()

    if (!color) {
      error('Expected color definition')
    }

    color.length = matchDistance()
    return color
  }

  function matchColor() {
    return matchHexColor()
      || matchHSLAColor()
      || matchHSLColor()
      || matchRGBAColor()
      || matchRGBColor()
      || matchVarColor()
      || matchLiteralColor()
  }

  function matchLiteralColor() {
    return match('literal', tokens.literalColor, 0)
  }

  function matchHexColor() {
    return match('hex', tokens.hexColor, 1)
  }

  function matchRGBColor() {
    return matchCall(tokens.rgbColor, () => {
      return {
        type: 'rgb',
        value: matchListing(matchNumber),
      }
    })
  }

  function matchRGBAColor() {
    return matchCall(tokens.rgbaColor, () => {
      return {
        type: 'rgba',
        value: matchListing(matchNumber),
      }
    })
  }

  function matchVarColor() {
    return matchCall(tokens.varColor, () => {
      return {
        type: 'var',
        value: matchVariableName(),
      }
    })
  }

  function matchHSLColor() {
    return matchCall(tokens.hslColor, () => {
      // Check for percentage before trying to parse the hue
      const lookahead = scan(tokens.percentageValue)
      if (lookahead) {
        error('HSL hue value must be a number in degrees (0-360) or normalized (-360 to 360), not a percentage')
      }

      const hue = matchNumber()
      scan(tokens.comma)
      let captures = scan(tokens.percentageValue)
      const sat = captures ? captures[1] : null
      scan(tokens.comma)
      captures = scan(tokens.percentageValue)
      const light = captures ? captures[1] : null
      if (!sat || !light) {
        error('Expected percentage value for saturation and lightness in HSL')
      }
      return {
        type: 'hsl',
        value: [hue, sat, light],
      }
    })
  }

  function matchHSLAColor() {
    return matchCall(tokens.hslaColor, () => {
      const hue = matchNumber()
      scan(tokens.comma)
      let captures = scan(tokens.percentageValue)
      const sat = captures ? captures[1] : null
      scan(tokens.comma)
      captures = scan(tokens.percentageValue)
      const light = captures ? captures[1] : null
      scan(tokens.comma)
      const alpha = matchNumber()
      if (!sat || !light) {
        error('Expected percentage value for saturation and lightness in HSLA')
      }
      return {
        type: 'hsla',
        value: [hue, sat, light, alpha],
      }
    })
  }

  function matchPercentage() {
    const captures = scan(tokens.percentageValue)
    return captures ? captures[1] : null
  }

  function matchVariableName() {
    return scan(tokens.variableName)[1]
  }

  function matchNumber() {
    return scan(tokens.number)[1]
  }

  function matchDistance() {
    return match('%', tokens.percentageValue, 1)
      || matchPositionKeyword()
      || matchCalc()
      || matchLength()
  }

  function matchPositionKeyword() {
    return match('position-keyword', tokens.positionKeywords, 1)
  }

  function matchCalc() {
    return matchCall(tokens.calcValue, () => {
      let openParenCount = 1 // Start with the opening parenthesis from calc(
      let i = 0

      // Parse through the content looking for balanced parentheses
      while (openParenCount > 0 && i < input.length) {
        const char = input.charAt(i)
        if (char === '(') {
          openParenCount++
        }
        else if (char === ')') {
          openParenCount--
        }
        i++
      }

      // If we exited because we ran out of input but still have open parentheses, error
      if (openParenCount > 0) {
        error('Missing closing parenthesis in calc() expression')
      }

      // Get the content inside the calc() without the last closing paren
      const calcContent = input.substring(0, i - 1)

      // Consume the calc expression content
      consume(i - 1) // -1 because we don't want to consume the closing parenthesis

      return {
        type: 'calc',
        value: calcContent,
      }
    })
  }

  function matchLength() {
    return match('px', tokens.pixelValue, 1)
      || match('em', tokens.emValue, 1)
  }

  function match(type, pattern, captureIndex) {
    const captures = scan(pattern)
    if (captures) {
      return {
        type,
        value: captures[captureIndex],
      }
    }
  }

  function scan(regexp) {
    let captures,
      blankCaptures

    blankCaptures = /^\s+/.exec(input)
    if (blankCaptures) {
      consume(blankCaptures[0].length)
    }

    captures = regexp.exec(input)
    if (captures) {
      consume(captures[0].length)
    }

    return captures
  }

  function consume(size) {
    input = input.substr(size)
  }

  return function (code) {
    input = code.toString().trim()
    // Remove trailing semicolon if present
    if (input.endsWith(';')) {
      input = input.slice(0, -1)
    }
    return getAST()
  }
})()

export const parseGradient = GradientParser.parse.bind(GradientParser)
