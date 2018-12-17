/* @flow */

import once from 'lodash/once';

module.exports = function(delay: number) {
	return once(() => new Promise<void>((resolve, reject) => {
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
