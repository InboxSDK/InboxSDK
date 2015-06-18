/* @flow */
// jshint ignore:start

import _ from 'lodash';

export default class GmailKeyboardShortcutHandle {
	_chord: string;
	_removeCallback: () => void;

	constructor(chord: string, removeCallback: () => void) {
		this._chord = chord;
		this._removeCallback = _.once(removeCallback);
	}

	getChord(): string {
		return this._chord;
	}

	destroy() {
		this._removeCallback();
	}
}
