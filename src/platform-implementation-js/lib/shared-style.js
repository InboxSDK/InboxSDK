/* @flow */

import type Kefir from 'kefir';
import udKefir from 'ud-kefir';
import rewriteCssWithIdMap from './rewriteCssWithIdMap';
var fs = require('fs');
var cssContent: Kefir.Observable<string> = udKefir(module, fs.readFileSync(__dirname + '/../style/shared.css', 'utf8'));

export default function sharedStyle(root: Document=document) {
	if (!root.getElementById('inboxsdk__shared_style')){
		const style = root.createElement('style');
		style.id = 'inboxsdk__shared_style';
		cssContent.onValue(css => {
			style.textContent = rewriteCssWithIdMap(css);
		});
		root.head.appendChild(style);
	}
}
