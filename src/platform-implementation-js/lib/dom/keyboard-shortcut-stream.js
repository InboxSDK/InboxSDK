'use strict';

var Bacon = require('baconjs');
var Combokeys = require('combokeys-capture');

var combokeys = new Combokeys(document.body, true);

module.exports = function(chord){

	return Bacon.fromBinder(function(sink){

		var unbinder = combokeys.bind(chord, function(domEvent){
											sink(domEvent);
											return false;
										}, 'keydown');

		return unbinder;

	});

};
