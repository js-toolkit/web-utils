export function getAppContainer(id = 'root'): HTMLElement {
  const container = document.getElementById(id);
  if (!container) throw new Error(`Container "${id}" for the app is not found.`);
  return container;
}
