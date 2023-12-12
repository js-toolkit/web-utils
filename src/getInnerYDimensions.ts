export interface InnerYDimensions {
  height: number;
  top: number;
  bottom: number;
}

export function getInnerYDimensions(
  elementOrComputedStyle: Element | CSSStyleDeclaration
): InnerYDimensions {
  const { boxSizing, paddingTop, paddingBottom, borderTopWidth, borderBottomWidth, height } =
    'tagName' in elementOrComputedStyle
      ? window.getComputedStyle(elementOrComputedStyle)
      : elementOrComputedStyle;

  const top = parseFloat(paddingTop) + parseFloat(borderTopWidth);
  const bottom = parseFloat(paddingBottom) + parseFloat(borderBottomWidth);

  const innerHeight =
    boxSizing === 'border-box' ? parseFloat(height) - top - bottom : parseFloat(height);

  return { height: innerHeight, top, bottom };
}
