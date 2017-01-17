var _ = require('lodash');

module.exports = function(delay) {
	return _.once(function() {
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
