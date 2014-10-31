var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var MessageView = require('../views/message-view');

var MessageManager = function(appId, driver){
	BasicClass.call(this);

	this._appId = appId;
	this._driver = driver;

	this._bindToStream();
};

MessageManager.prototype = Object.create(BasicClass.prototype);

_.extend(MessageManager.prototype, {

	__memberVariables: [
		{name: '_registrars', destroy: false, defaultValue: []},
		{name: '_messageViewStream', destroy: true}
	],

	register: function(definition){
		this._registrars.push(definition);
	},

	_bindToStream: function(){
		this._messageViewStream = this._driver.getMessageViewDriverStream().onValue(this, '_newMessageViewDriver');
	},

	_newMessageViewDriver: function(messageViewDriver){
		var messageView = new MessageView(messageViewDriver);

		this._registrars.forEach(function(registrar){
			registrar.onNewMessageView(messageView);
		});
	}

});

module.exports = MessageManager;
