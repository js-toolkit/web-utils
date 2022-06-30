export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }

  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.textContent = text;
    textarea.style.position = 'fixed';
    textarea.style.bottom = '-100px';
    textarea.readOnly = true; // To avoid showing keyboard;
    document.body.appendChild(textarea);

    const range = document.createRange();
    range.selectNode(textarea);
    const selection = window.getSelection();
    if (!selection) {
      reject(new Error('No selection for copy to clipboard.'));
      return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
    textarea.setSelectionRange(0, 999999);

    try {
      document.execCommand('copy', false);
      resolve();
    } catch (err) {
      reject(err);
    } finally {
      selection.removeAllRanges();
      document.body.removeChild(textarea);
    }
  });
}
