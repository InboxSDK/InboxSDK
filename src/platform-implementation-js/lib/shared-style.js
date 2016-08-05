/* @flow */
//jshint ignore:start

import type Kefir from 'kefir';
import udKefir from 'ud-kefir';
var fs = require('fs');
var cssContent: Kefir.Stream<string> = udKefir(module, fs.readFileSync(__dirname + '/../style/shared.css', 'utf8'));

export default function sharedStyle() {
	if (!document.getElementById('inboxsdk__shared_style')){
		var style = document.createElement('style');
		style.id = 'inboxsdk__shared_style';
		cssContent.onValue(css => {
			style.textContent = css;
		});
		document.head.appendChild(style);
	}
}
