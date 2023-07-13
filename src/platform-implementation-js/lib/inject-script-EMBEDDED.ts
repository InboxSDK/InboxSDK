/* eslint-disable @typescript-eslint/no-var-requires */
export function injectScriptEmbedded() {
  const script = document.createElement('script');
  script.type = 'text/javascript';

  const originalCode = require('../../../packages/core/pageWorld?raw');

  script.text = originalCode;

  document.head.appendChild(script).parentNode!.removeChild(script);
}
