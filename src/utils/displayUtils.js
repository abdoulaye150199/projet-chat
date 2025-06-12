export function toggleDisplay(element, show) {
  if (element) {
    element.setAttribute('data-state', show ? 'visible' : 'hidden');
  }
}