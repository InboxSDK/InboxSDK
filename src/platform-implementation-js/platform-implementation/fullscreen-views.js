var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var FullscreenViewDescriptor = require('../views/fullscreen-view/fullscreen-view-descriptor');
var FullscreenView = require('../views/fullscreen-view/fullscreen-view');

var FullscreenViews = function(appId, driver){
	EventEmitter.call(this);

	this._appId = appId;
	this._driver = driver;
	this._fullscreenDescriptors = [];

	this._currentFullscreenViewDriver = null;
	this._customFullscreenViews = [];

	this._setupNativeFullscreenViewDescriptors();
	this._watchForFullscreenViewChanges();
};

FullscreenViews.prototype = Object.create(EventEmitter.prototype);


_.extend(FullscreenViews.prototype,  {

	createLink: function(name, paramArray){
		return this._driver.createLink(name, paramArray);
	},

	gotoView: function(name, paramArray){
		this._driver.gotoView(name, paramArray);
	},

	/* deprecated */
	getDescriptor: function(name){
		return _.find(this._fullscreenDescriptors, function(fullscreenViewDescriptor){
			return fullscreenViewDescriptor.getName() === name;
		});
	},

	getCurrent: function(){
		return this._currentFullscreenView;
	},

	registerCustom: function(options){
		this._customFullscreenViews.push(options);

		this._fullscreenDescriptors.push(
			new FullscreenViewDescriptor({
				name: options.name,
				isCustomView: true,
				driver: this._driver
			})
		);
	},

	_setupNativeFullscreenViewDescriptors: function(){
		var nativeViewNames = this._driver.getNativeViewNames();

		var self = this;
		nativeViewNames.forEach(function(viewName){

			self._fullscreenDescriptors.push(
				new FullscreenViewDescriptor({
					name: viewName,
					isCustomView: false,
					driver: self._driver
				})
			);

		});
	},

	_watchForFullscreenViewChanges: function(){
		this._driver.getFullscreenViewDriverStream().onValue(this, '_handleFullscreenViewChange');
	},

	_handleFullscreenViewChange: function(fullscreenViewDriver){
		if(this._currentFullscreenViewDriver){
			this._currentFullscreenViewDriver.destroy();
		}

		var fullscreenViewDescriptor = this.getDescriptor(fullscreenViewDriver.getName());
		if(!fullscreenViewDescriptor){
			fullscreenViewDriver.destroy();
			return;
		}

		this._currentFullscreenViewDriver = fullscreenViewDriver;

		var fullscreenView = new FullscreenView(fullscreenViewDriver, fullscreenViewDescriptor);

		if(fullscreenViewDescriptor.isCustomView()){
			this._driver.showCustomFullscreenView(fullscreenViewDriver.getCustomViewElement());
			this._informRelevantCustomViews(fullscreenView);
		}
		else{
			this._driver.showNativeFullscreenView();
		}

		this.emit('change', {fullscreenView: fullscreenView});
	},

	_informRelevantCustomViews: function(fullscreenView){
		this._customFullscreenViews
			.filter(function(customFullscreenView){
				return customFullscreenView.name === fullscreenView.getDescriptor().getName();
			})
			.forEach(function(customFullscreenView){
				customFullscreenView.onActivate({
					fullscreenView: fullscreenView,
					el: fullscreenView.getElement()
				});
			});
	}

});

module.exports = FullscreenViews;
