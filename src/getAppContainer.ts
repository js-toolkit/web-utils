export function getAppContainer(id = 'root'): HTMLElement {
  const container = document.getElementById(id);
  if (!container) throw new Error(`Container "${id}" for app not found.`);
  return container;
}

export default getAppContainer;
