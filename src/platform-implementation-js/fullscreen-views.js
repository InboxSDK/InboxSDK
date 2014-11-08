var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var FullscreenViewDescriptor = require('./views/fullscreen-view/fullscreen-view-descriptor');
var FullscreenView = require('./views/fullscreen-view/fullscreen-view');

var FullscreenViews = function(appId, driver){
	EventEmitter.call(this);

	this._appId = appId;
	this._driver = driver;
	this._fullscreenDescriptors = [];

	this._currentFullscreenView = null;
	this._customFullscreenViews = [];

	this._setupNativeFullscreenViewDescriptors();
	this._watchForFullscreenViewChanges();
};

FullscreenViews.prototype = Object.create(EventEmitter.prototype);


_.extend(FullscreenViews.prototype,  {

	getDescriptor: function(name){
		return _.find(this._fullscreenDescriptors, function(fullscreenViewDescriptor){
			return fullscreenViewDescriptor.getName() === name;
		});
	},

	registerCustom: function(options){
		this._customFullscreenViews.push(options);

		this._fullscreenDescriptors.push(
			new FullscreenViewDescriptor({
				name: options.name,
				isCustomView: true
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
					isCustomView: false
				})
			);

		});
	},

	_watchForFullscreenViewChanges: function(){
		this._driver.getFullscreenViewDriverStream().onValue(this, '_handleFullscreenViewChange');
	},

	_handleFullscreenViewChange: function(fullscreenViewDriver){
		if(this._currentFullscreenView){
			this._currentFullscreenView.destroy();
		}

		var fullscreenViewDescriptor = this.getDescriptor(fullscreenViewDriver.getName());
		if(!fullscreenViewDescriptor){
			fullscreenViewDriver.destroy();
			return;
		}

		this._currentFullscreenView = new FullscreenView(fullscreenViewDriver, fullscreenViewDescriptor);

		if(fullscreenViewDescriptor.isCustomView()){
			this._driver.showCustomFullscreenView(fullscreenViewDriver.getCustomViewElement());
			this._informRelevantCustomViews(this._currentFullscreenView);
		}
		else{
			this._driver.showNativeFullscreenView();
		}

		this.emit('change', {view: this._currentFullscreenView});
	},

	_informRelevantCustomViews: function(fullscreenView){
		this._customFullscreenViews.forEach(function(customFullscreenView){
			customFullscreenView.onActivate({
				view: fullscreenView,
				el: fullscreenView.getElement()
			});
		});
	}

});

module.exports = FullscreenViews;
