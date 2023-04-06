export interface InnerXDimensions {
  width: number;
  left: number;
  right: number;
}

export function getInnerXDimensions(
  elementOrComputedStyle: Element | CSSStyleDeclaration
): InnerXDimensions {
  const { boxSizing, paddingLeft, paddingRight, borderLeftWidth, borderRightWidth, width } =
    'tagName' in elementOrComputedStyle
      ? window.getComputedStyle(elementOrComputedStyle)
      : elementOrComputedStyle;

  const left = parseFloat(paddingLeft) + parseFloat(borderLeftWidth);
  const right = parseFloat(paddingRight) + parseFloat(borderRightWidth);

  const innerWidth =
    boxSizing === 'border-box' ? parseFloat(width) - left - right : parseFloat(width);

  return { width: innerWidth, left, right };
}

export default getInnerXDimensions;
