var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var Toolbars = function(appId, driver, platformImplementation){
	EventEmitter.call(this);

	this._appId = appId;
	this._driver = driver;
	this._platformImplementation = platformImplementation;

	this._threadListButtonDescriptors = [];
	this._threadViewButtonDesriptors = [];

	this._threadListNoSelectionsMoreItemDescriptors = [];
	this._threadListWithSelectionsMoreItemDescriptors = [];
	this._threadViewMoreItemDescriptors = [];

	this._setupViewDriverWatchers();
};

Toolbars.prototype = Object.create(EventEmitter.prototype);

_.extend(Toolbars.prototype, {

	registerThreadListNoSelectionsButton: function(buttonDescriptor){
		this._threadListButtonDescriptors.push(_.merge(this._processButtonDescriptor(buttonDescriptor), {toolbarState: 'COLLASED'}));
	},

	registerThreadListWithSelectionsButton: function(buttonDescriptor){
		this._threadListButtonDescriptors.push(_.merge(this._processButtonDescriptor(buttonDescriptor), {toolbarState: 'EXPANDED'}));
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
		//var fullscreenView = this._platformImplementation.FullscreenViews.getCurrent();
		var buttonDescriptors = null;

		if(toolbarViewDriver.getRowListViewDriver()){
			buttonDescriptors = this._threadListButtonDescriptors;
		}
		else if(toolbarViewDriver.getThreadViewDriver()){
			buttonDescriptors = this._threadViewButtonDesriptors;
		}

		_.chain(buttonDescriptors)
			.filter(function(buttonDescriptor){
				return true; /* deprecated */
				//return buttonDescriptor.showFor(fullscreenView);
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
			buttonOptions.preMenuShowFunction = function(menuView, menuButtonViewController){
				buttonDescriptor.onClick({
					dropdown: {
						el: menuView.getElement(),
						close: menuButtonViewController.hideMenu.bind(menuButtonViewController)
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

module.exports = Toolbars;
