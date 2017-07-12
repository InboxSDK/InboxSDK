/* @flow */

export type URLObject = {
	name: string;
	params: string[];
	query: ?string;
	hash: string;
};

export default function getURLObject(url: string): URLObject {
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
		params: hashParts
			.slice(1)
			.map(part => part.replace(/\+/g, ' '))
			.map(decodeURIComponent),
		query: m[2],
		hash
	};
}
