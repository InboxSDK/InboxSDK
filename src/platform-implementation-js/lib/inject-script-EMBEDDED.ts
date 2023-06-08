/* eslint-disable @typescript-eslint/no-var-requires */
export function injectScriptEmbedded() {
  const url = 'https://www.inboxsdk.com/build/pageWorld.js';

  const script = document.createElement('script');
  script.type = 'text/javascript';

  const originalCode = require('raw-loader!../../../packages/core/pageWorld.js');

  const codeParts: string[] = [];
  codeParts.push(originalCode.default);
  codeParts.push('\n//# sourceURL=' + url + '\n');

  const codeToRun = codeParts.join('');
  script.text = codeToRun;

  document.head.appendChild(script).parentNode!.removeChild(script);
}
