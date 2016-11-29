/* @flow */

// For quick temporary CSS changes
export default function setCss(key: string, css: ?string) {
  const id = `inboxsdk__${key}`;
  let style = document.getElementById(id);
  if (!css) {
    if (style) {
      style.remove();
    }
    return;
  }
  if (!style) {
    style = document.createElement('style');
    style.className = 'inboxsdk__custom';
    style.id = id;
    document.head.appendChild(style);
  }
  style.textContent = css;
}
