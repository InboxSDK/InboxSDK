/* @flow */

import type Kefir from 'kefir';
import udKefir from 'ud-kefir';
var fs = require('fs');
var cssContent: Kefir.Observable<string> = udKefir(module, fs.readFileSync(__dirname + '/../../style/inbox.css', 'utf8'));

export default function customStyle(root: Document=document) {
	if (!root.getElementById('inboxsdk__style')){
		const style = root.createElement('style');
		style.id = 'inboxsdk__style';
		cssContent.onValue(css => {
			style.textContent = css;
		});
		root.head.appendChild(style);
	}
}
