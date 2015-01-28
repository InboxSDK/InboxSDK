'use strict';

var Bacon = require('baconjs');
var Combokeys = require('combokeys');

var combokeys = new Combokeys(document);

module.exports = function(chord){

	return Bacon.fromBinder(function(sink){

		combokeys.bind(chord, function(domEvent){
			sink(domEvent);
			return false;
		});

		return function(){
			combokeys.unbind(chord);
		};

	});

};
