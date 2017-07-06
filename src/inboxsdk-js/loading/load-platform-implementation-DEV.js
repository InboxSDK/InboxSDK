/* @flow */

import once from 'lodash/once';

module.exports = function(delay: number) {
	return once(function() {
		return new Promise(function(resolve, reject) {
			setTimeout(function() {
				try {
					require('../../platform-implementation-js/main.js');
					resolve();
				} catch (e) {
					reject(e);
				}
			}, delay);
		});
	});
};
