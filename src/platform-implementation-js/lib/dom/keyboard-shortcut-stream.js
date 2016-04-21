/* @flow */

import Kefir from 'kefir';
import Combokeys from 'combokeys-capture';

const combokeys = global.document && new Combokeys(document.body, true);

export default function keyboardShortcutStream(chord: string): Kefir.Stream {
	return Kefir.stream(function(emitter) {
		return combokeys && combokeys.bind(chord, function(domEvent){
			emitter.emit(domEvent);
			return false;
		}, 'keydown');
	});
};
