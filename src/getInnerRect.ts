export default function getInnerRect(element: Element): ClientRect {
  const {
    boxSizing,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    borderLeftWidth,
    borderRightWidth,
    borderTopWidth,
    borderBottomWidth,
    width,
    height,
  } = window.getComputedStyle(element);

  const left = parseFloat(paddingLeft) - parseFloat(borderLeftWidth);
  const right = parseFloat(paddingRight) - parseFloat(borderRightWidth);
  const top = parseFloat(paddingTop) - parseFloat(borderTopWidth);
  const bottom = parseFloat(paddingBottom) - parseFloat(borderBottomWidth);

  const innerWidth =
    boxSizing === 'border-box' ? parseFloat(width) - left - right : parseFloat(width);

  const innerHeight =
    boxSizing === 'border-box' ? parseFloat(height) - top - bottom : parseFloat(height);

  return {
    width: innerWidth,
    height: innerHeight,
    left,
    right,
    top,
    bottom,
  };
}
