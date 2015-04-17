var Bacon = require('baconjs');
var Combokeys = require('combokeys-capture');

const combokeys = global.document && new Combokeys(document.body, true);

module.exports = function(chord){
	return Bacon.fromBinder(function(sink){
		return combokeys && combokeys.bind(chord, function(domEvent){
			sink(domEvent);
			return false;
		}, 'keydown');
	});
};
