var _ = require('lodash');
var Bacon = require('baconjs');

var BasicClass = require('../../../../lib/basic-class');

var LabelDropdownButtonView = function(options){
	BasicClass.call(this);

	this._eventStream = new Bacon.Bus();

	this._setupElement(options.backgroundColor, options.foregroundColor);
	this._setupEventStream();
};

LabelDropdownButtonView.prototype = Object.create(BasicClass.prototype);

_.extend(LabelDropdownButtonView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: true, get: true},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'}
	],

	activate: function(){/* do nothing */},

	deactivate: function(){/* do nothing */},

	_setupElement: function(backgroundColor, foregroundColor){
		this._element = document.createElement('div');
		this._element.setAttribute('class', 'nL aig');

		var isDefault = !backgroundColor && !foregroundColor;

		if(!backgroundColor){
			backgroundColor = 'rgb(194, 194, 194)';
		}

		if(!foregroundColor){
			foregroundColor = 'rgb(255, 255, 255)';
		}

		this._element.innerHTML = [
			'<div class="pM ' + (isDefault ? 'aj0': '') + '" style="color: ' + foregroundColor + '; background-color: ' + backgroundColor + '; border-color: ' + backgroundColor + '" role="button">',
				'<div class="p6 style="background-color: ' + backgroundColor + '">',
					'<div class="p8">▼</div>',
				'</div>',
			'</div>'
		].join('');
	},

	_setupEventStream: function(){
		var clickEventStream = Bacon.fromEventTarget(this._element, 'click');

		clickEventStream.onValue(function(event){
			event.stopPropagation();
			event.preventDefault();
		});

		this._eventStream.plug(
			clickEventStream.map(function(event){
				return {
					eventName: 'click',
					domEvent: event
				};
			})
		);
	}

});

module.exports = LabelDropdownButtonView;
