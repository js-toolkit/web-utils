export default function copyToClipboard(text: string): boolean {
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
    console.warn('No selection for copy to clipboard.');
    return false;
  }
  selection.removeAllRanges();
  selection.addRange(range);
  textarea.setSelectionRange(0, 999999);

  try {
    document.execCommand('copy', false);
    return true;
  } catch (err) {
    console.error(err);
  } finally {
    selection.removeAllRanges();
    document.body.removeChild(textarea);
  }

  return false;
}
