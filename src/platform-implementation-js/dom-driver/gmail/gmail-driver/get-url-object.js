/* @flow */
//jshint ignore:start

var _ = require('lodash');

export type URLObject = {
	name: string;
	params: string[];
	query: ?string;
	hash: string;
};

export default function getURLObject(url: string): URLObject {
	var m = url.match(/#([^?]*)(?:\?(.*))?/);
	if (!m) {
		return {
			name: 'inbox',
			params: [],
			hash: '',
			query: undefined
		};
	}

	var hash = m[1];
	var hashParts = hash.split('/');

	return {
		name: decodeURIComponent(hashParts[0]),
		params: _.chain(hashParts)
			.tail()
			.map(part => part.replace(/\+/g, ' '))
			.map(decodeURIComponent)
			.value(),
		query: m[2],
		hash
	};
}
