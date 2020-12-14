import getInnerXDimensions, { InnerXDimensions } from './getInnerXDimensions';
import getInnerYDimensions, { InnerYDimensions } from './getInnerYDimensions';

export interface InnerRect extends InnerXDimensions, InnerYDimensions {}

export default function getInnerRect(
  elementOrComputedStyle: Element | CSSStyleDeclaration
): ClientRect {
  const computedStyle =
    'tagName' in elementOrComputedStyle
      ? window.getComputedStyle(elementOrComputedStyle)
      : elementOrComputedStyle;

  return Object.assign(getInnerXDimensions(computedStyle), getInnerYDimensions(computedStyle));
}
