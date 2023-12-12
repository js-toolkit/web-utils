export function saveFileAs(
  filename: string,
  url: string,
  attrs?: Record<string, string> | undefined
): void {
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.setAttribute('type', 'attachment');
  if (attrs) {
    Object.entries(attrs).forEach(([name, value]) => {
      link.setAttribute(name, value);
      if (name === 'target' && value === '_blank' && attrs.rel == null) {
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }
  link.click();
}

// if (document.createEvent) {
//   const event = document.createEvent('MouseEvents');
//   event.initEvent('click', true, true);
//   link.dispatchEvent(event);
// } else {
//   link.click();
// }
