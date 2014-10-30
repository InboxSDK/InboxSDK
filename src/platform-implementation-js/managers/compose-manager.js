var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var ComposeView = require('../views/compose-view');

var ComposeManager = function(appId, driver){
	BasicClass.call(this);

	this._appId = appId;
	this._driver = driver;

	this._bindToStreams();
};

ComposeManager.prototype = Object.create(BasicClass.prototype);

_.extend(ComposeManager.prototype, {

	__memberVariables: [
		{name: '_buttonCreators', destroy: false, defaultValue: []},
		{name: '_composeWindowViewStream', destroy: true},
		{name: '_replyWindowViewStream', destroy: true}
	],

	registerComposeButtonCreator: function(creator){
		this._buttonCreators.push(creator);
	},

	_bindToStreams: function(){
		this._composeWindowViewStream = this._driver.getComposeViewDriverStream().onValue(this, '_handleNewComposeViewDriver');
		this._replyWindowViewStream = this._driver.getReplyViewDriverStream().onValue(this, '_handleNewComposeViewDriver');
	},

	_handleNewComposeViewDriver: function(composeViewDriver){
		var self = this;

		var composeView = new ComposeView(composeViewDriver);

		this._buttonCreators.forEach(function(creator){
			var definition = creator({composeView: composeView});

			if(definition){
				self._addActionButtonToCompose(definition, composeViewDriver, composeView);
			}
		});
	},

	_handleNewReplyViewDriver: function(replyViewDriver){
		var self = this;
		this._buttonDefinitions.forEach(function(buttonDefinition){
			self._addActionButtonToCompose(buttonDefinition, replyWindow);
		});
	},

	_addActionButtonToCompose: function(definition, composeViewDriver, composeView){
		var buttonOptions = {
			iconClass: definition.iconClass,
			iconUrl: definition.iconUrl,
			tooltip: definition.tooltip,
			activateFunction: function(){
				definition.onClick({
					composeView: composeView
				});
			}
		};

		composeViewDriver.addActionButton(buttonOptions);
	}

});

module.exports = ComposeManager;
