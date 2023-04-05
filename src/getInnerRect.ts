import getInnerXDimensions, { type InnerXDimensions } from './getInnerXDimensions';
import getInnerYDimensions, { type InnerYDimensions } from './getInnerYDimensions';

export interface InnerRect extends InnerXDimensions, InnerYDimensions {}

export default function getInnerRect(
  elementOrComputedStyle: Element | CSSStyleDeclaration
): InnerRect {
  const computedStyle =
    'tagName' in elementOrComputedStyle
      ? window.getComputedStyle(elementOrComputedStyle)
      : elementOrComputedStyle;

  return Object.assign(getInnerXDimensions(computedStyle), getInnerYDimensions(computedStyle));
}
