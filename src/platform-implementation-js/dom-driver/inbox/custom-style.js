/* @flow */

import type Kefir from 'kefir';
import udKefir from 'ud-kefir';
import rewriteCssWithIdMap from '../../lib/rewriteCssWithIdMap';
var fs = require('fs');
var cssContent: Kefir.Observable<string> = udKefir(module, fs.readFileSync(__dirname + '/../../style/inbox.css', 'utf8'));

export default function customStyle(root: Document=document) {
	if (!root.getElementById('inboxsdk__style')){
		const style = root.createElement('style');
		style.id = 'inboxsdk__style';
		cssContent.onValue(css => {
			style.textContent = rewriteCssWithIdMap(css);
		});
		root.head.appendChild(style);
	}
}
