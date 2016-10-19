/* @flow */

import type Kefir from 'kefir';
import udKefir from 'ud-kefir';
import rewriteCssWithIdMap from '../../lib/rewriteCssWithIdMap';
var fs = require('fs');
var cssContent: Kefir.Observable<string> = udKefir(module, fs.readFileSync(__dirname + '/../../style/gmail.css', 'utf8'));

export default function customStyle() {
	if (!document.getElementById('inboxsdk__style')){
		var style = document.createElement('style');
		style.id = 'inboxsdk__style';
		cssContent.onValue(css => {
			style.textContent = rewriteCssWithIdMap(css);
		});
		document.head.appendChild(style);
	}
}
