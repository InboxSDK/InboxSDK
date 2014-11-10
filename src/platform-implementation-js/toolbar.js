	var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var Toolbar = function(appId, driver, platformImplementation){
	EventEmitter.call(this);

	this._appId = appId;
	this._driver = driver;
	this._platformImplementation = platformImplementation;

	this._threadListNoSelectionButtonDescriptors = [];
	this._threadListWithSelectionsButtonDescriptors = [];
	this._threadViewButtonDesriptors = [];

	this._threadListNoSelectionsMoreItemDescriptors = [];
	this._threadListWithSelectionsMoreItemDescriptors = [];
	this._threadViewMoreItemDescriptors = [];

	this._setupViewDriverWatchers();
};

Toolbar.prototype = Object.create(EventEmitter.prototype);

_.extend(Toolbar.prototype, {

	registerThreadListNoSelectionsButton: function(buttonDescriptor){
		this._threadListNoSelectionButtonDescriptors.push(this._processButtonDescriptor(buttonDescriptor));
	},

	registerThreadListWithSelectionsButton: function(buttonDescriptor){
		this._threadListWithSelectionsButtonDescriptors.push(this._processButtonDescriptor(buttonDescriptor));
	},

	registerThreadViewButton: function(buttonDescriptor){
		this._threadViewButtonDesriptors.push(this._processButtonDescriptor(buttonDescriptor));
	},

	registerThreadListNoSelectionsMoreItem: function(buttonDescriptor){
		this._threadListNoSelectionsMoreItemDescriptors.push(this._processButtonDescriptor(buttonDescriptor));
	},

	registerThreadListWithSelectionsMoreItem: function(buttonDescriptor){
		this._threadListWithSelectionsMoreItemDescriptors.push(this._processButtonDescriptor(buttonDescriptor));
	},

	registerThreadViewMoreItem: function(buttonDescriptor){
		this._threadViewMoreItemDescriptors.push(this._processButtonDescriptor(buttonDescriptor));
	},

	_setupViewDriverWatchers: function(){
		this._setupToolbarViewDriverWatcher();
		this._setupMoreMenuViewDriverWatcher();
	},

	_setupToolbarViewDriverWatcher: function(){
		this._driver.getToolbarViewDriverStream().delay(10).onValue(this, '_handleNewToolbarViewDriver');
	},

	_handleNewToolbarViewDriver: function(toolbarViewDriver){
		var fullscreenView = this._platformImplementation.FullscreenViews.getCurrent();
		var buttonDescriptors = null;

		if(toolbarViewDriver.getRowListViewDriver()){
			buttonDescriptors = this._threadListWithSelectionsButtonDescriptors;
		}
		else if(toolbarViewDriver.getThreadViewDriver()){
			buttonDescriptors = this._threadViewButtonDesriptors;
		}

		_.chain(buttonDescriptors)
			.filter(function(buttonDescriptor){
				return buttonDescriptor.showFor(fullscreenView);
			})
			.each(function(buttonDescriptor){
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
