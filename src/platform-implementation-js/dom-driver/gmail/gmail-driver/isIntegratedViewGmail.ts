export default function isIntegratedViewGmail(): boolean {
  const nav = document.querySelector('div[role=navigation]');
  return Boolean(nav?.firstElementChild?.classList.contains('Xa'));
}
