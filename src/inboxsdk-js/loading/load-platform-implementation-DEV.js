/* @flow */

import once from 'lodash/once';

module.exports = function(delay: number): () => Promise<void> {
	return once(() => new Promise((resolve, reject) => {
		setTimeout(() => {
			try {
				require('../../platform-implementation-js/main.js');
				resolve();
			} catch (e) {
				reject(e);
			}
		}, delay);
	}));
};
