var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var Toolbar = function(appId, driver){
	EventEmitter.call(this);

	this._appId = appId;
	this._driver = driver;

	this._buttonDescriptors = [];

	this._setupViewDriverWatchers();
};

Toolbar.prototype = Object.create(EventEmitter.prototype);

_.extend(Toolbar.prototype, {

	registerThreadListNoSelectionsButton: function(buttonDescriptor){
		this._buttonDescriptors.push(this._processButtonDescriptor(buttonDescriptor));
	},

	registerThreadListWithSelectionsButton: function(buttonDescriptor){

	},

	registerThreadViewButton: function(buttonDescriptor){

	},

	registerThreadListNoSelectionsMoreItem: function(buttonDescriptor){

	},

	registerThreadListWithSelectionsMoreItem: function(buttonDescriptor){

	},

	registerThreadViewMoreItem: function(buttonDescriptor){

	},

	_setupViewDriverWatchers: function(){
		this._setupToolbarViewDriverWatcher();
		this._setupMoreMenuViewDriverWatcher();
	},

	_setupToolbarViewDriverWatcher: function(){
		this._driver.getToolbarViewDriverStream().onValue(this, '_handleNewToolbarViewDriver');
	},

	_handleNewToolbarViewDriver: function(toolbarViewDriver){
		this._buttonDescriptors.forEach(function(buttonDescriptor){
			/* if(buttonDescriptor.showFor(fullScreenView)){

			} */

			toolbarViewDriver.addButton(buttonDescriptor);
		});
	},

	_setupMoreMenuViewDriverWatcher: function(){
		//todo
	},

	_processButtonDescriptor: function(buttonDescriptor){
		var buttonOptions = _.clone(buttonDescriptor);
		if(buttonDescriptor.hasDropdown){
			buttonOptions.preMenuShowFunction = function(menuView){
				buttonDescriptor.onClick({
					dropdown: {
						el: menuView.getElement()
					}
				});
			};
		}
		else{
			buttonOptions.activateFunction = buttonDescriptor.onClick;
		}

		return buttonOptions;
	}

});

module.exports = Toolbar;
