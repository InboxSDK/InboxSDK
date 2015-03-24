import _ from 'lodash';

export default function getURLObject(url) {
	const m = url.match(/#([^?]*)(?:\?(.*))?/);
	if (!m) {
		return {
			name: 'inbox',
			params: [],
			hash: '',
			query: undefined
		};
	}

	const hash = m[1];
	const hashParts = hash.split('/');

	return {
		name: decodeURIComponent(hashParts[0]),
		params: _.chain(hashParts)
			.rest()
			.map(part => part.replace(/\+/g, ' '))
			.map(decodeURIComponent)
			.value(),
		query: m[2],
		hash
	};
}
