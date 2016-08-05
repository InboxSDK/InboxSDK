/* @flow */

import type Kefir from 'kefir';
import udKefir from 'ud-kefir';
var fs = require('fs');
var cssContent: Kefir.Stream<string> = udKefir(module, fs.readFileSync(__dirname + '/../../style/inbox.css', 'utf8'));

export default function customStyle() {
	if (!document.getElementById('inboxsdk__style')){
		var style = document.createElement('style');
		style.id = 'inboxsdk__style';
		cssContent.onValue(css => {
			style.textContent = css;
		});
		document.head.appendChild(style);
	}
}
