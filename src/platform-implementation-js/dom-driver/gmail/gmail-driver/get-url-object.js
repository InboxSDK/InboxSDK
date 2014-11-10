var _ = require('lodash');

module.exports = function(url){

	var urlObject = {
		hash: ''
	};

	var urlParts = url.split('#');
	if(urlParts.length !== 2){
		urlObject.name = 'inbox';
		urlObject.params = [];
		return urlObject;
	}

	var hash = urlParts[1];

	var queryParts = hash.split('?');
	if(queryParts.length > 1){
		urlObject.query = queryParts[1];
		hash = queryParts[0];
	}

	var hashParts = hash.split('/');

	urlObject.name = decodeURIComponent(hashParts[0]);
	urlObject.params = _.chain(hashParts).rest().map(decodeURIComponent).value();
	urlObject.hash = hash;

	return urlObject;

};
