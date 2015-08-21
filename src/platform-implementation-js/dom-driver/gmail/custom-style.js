/* @flow */
//jshint ignore:start

import type Kefir from 'kefir';
import udKefir from 'ud-kefir';
var fs = require('fs');
var cssContent: Kefir.Stream = udKefir(module, fs.readFileSync(__dirname + '/style.css', 'utf8'));

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
