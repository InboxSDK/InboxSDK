import type * as Kefir from 'kefir';
import udKefir from 'ud-kefir';
import rewriteCssWithIdMap from '../../lib/rewriteCssWithIdMap';
// eslint-disable-next-line @typescript-eslint/no-var-requires
var fs = require('fs');
var cssContent: Kefir.Observable<string, unknown> = udKefir(
  module,
  fs.readFileSync(__dirname + '/../../style/gmail.css', 'utf8')
);

export default function customStyle() {
  if (!document.getElementById('inboxsdk__style')) {
    var style = document.createElement('style');
    style.id = 'inboxsdk__style';
    cssContent.onValue((css: any) => {
      style.textContent = rewriteCssWithIdMap(css);
    });
    if (!document.head) throw new Error('missing head');
    document.head.appendChild(style);
  }
}
