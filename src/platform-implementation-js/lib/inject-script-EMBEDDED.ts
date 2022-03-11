// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

export function injectScriptEmbedded() {
  const url = 'https://www.inboxsdk.com/build/pageWorld.js';

  const script = document.createElement('script');
  script.type = 'text/javascript';

  const originalCode = fs.readFileSync(
    __dirname + '/../../../dist/pageWorld.js',
    'utf8'
  );

  let disableSourceMappingURL = true;
  try {
    disableSourceMappingURL =
      localStorage.getItem('inboxsdk__enable_sourcemap') !== 'true';
  } catch (err) {
    console.error(err); //eslint-disable-line no-console
  }

  const codeParts: string[] = [];
  if (disableSourceMappingURL) {
    // Don't remove a data: URI sourcemap (used in dev)
    codeParts.push(
      originalCode.replace(/\/\/# sourceMappingURL=(?!data:)[^\n]*\n?$/, '')
    );
  } else {
    codeParts.push(originalCode);
  }
  codeParts.push('\n//# sourceURL=' + url + '\n');

  const codeToRun = codeParts.join('');
  script.text = codeToRun;

  document.head.appendChild(script).parentNode!.removeChild(script);
}
