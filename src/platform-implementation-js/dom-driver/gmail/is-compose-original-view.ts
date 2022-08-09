export default function isComposeOriginalView(): boolean {
  const composeEl = document.querySelector('div.T-I.T-I-KE.L3');
  if (
    composeEl &&
    getComputedStyle(composeEl)
      .getPropertyValue('background')
      .indexOf('rgb(255, 255, 255)') >= 0
  ) {
    return true;
  }
  return false;
}
