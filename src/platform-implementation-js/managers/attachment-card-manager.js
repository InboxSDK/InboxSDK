var _ = require('lodash');
var AttachmentCardView = require('../views/attachment-card-view');

var AttachmentCardManager = function(appId, driver){
	this._appId = appId;
	this._driver = driver;

	this._bindToStream();
};

_.extend(AttachmentCardManager.prototype, {

	__memberVariables: [
		{name: '_registrars', destroy: false, defaultValue: []},
		{name: '_viewStream', destroy: true}
	],

	register: function(definition){
		this._registrars.push(definition);
	},

	_bindToStream: function(){
		this._viewStream = this._driver.getAttachmentCardViewDriverStream().onValue(this, '_newViewDriver');
	},

	_newViewDriver: function(viewDriver){
		var attachmentCardView = new AttachmentCardView(viewDriver);

		this._registrars.forEach(function(registrar){
			registrar.onNewAttachmentCard(attachmentCardView);
		});
	}

});

module.exports = AttachmentCardManager;
