export function enterPseudoFullscreen(element: Element & ElementCSSInlineStyle): VoidFunction {
  let originStyle:
    | Pick<
        CSSStyleDeclaration,
        'position' | 'left' | 'top' | 'width' | 'height' | 'maxWidth' | 'maxHeight' | 'zIndex'
      >
    | undefined;
  let currentEl: (Element & ElementCSSInlineStyle) | undefined;

  originStyle = {
    position: element.style.position,
    left: element.style.left,
    top: element.style.top,
    width: element.style.width,
    height: element.style.height,
    maxWidth: element.style.maxWidth,
    maxHeight: element.style.maxHeight,
    zIndex: element.style.zIndex,
  };
  currentEl = element;
  currentEl.style.position = 'fixed';
  currentEl.style.left = '0px';
  currentEl.style.top = '0px';
  currentEl.style.width = '100%';
  currentEl.style.height = '100%';
  currentEl.style.maxWidth = '100%';
  currentEl.style.maxHeight = '100%';
  currentEl.style.zIndex = '99999';

  return () => {
    if (originStyle && currentEl) {
      currentEl.style.position = originStyle.position;
      currentEl.style.left = originStyle.left;
      currentEl.style.top = originStyle.top;
      currentEl.style.width = originStyle.width;
      currentEl.style.height = originStyle.height;
      currentEl.style.maxWidth = originStyle.maxWidth;
      currentEl.style.maxHeight = originStyle.maxHeight;
      currentEl.style.zIndex = originStyle.zIndex;
    }
    originStyle = undefined;
    currentEl = undefined;
  };
}
