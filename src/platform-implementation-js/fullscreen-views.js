var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;

var FullscreenViewDescriptor = require('./views/fullscreen-view/fullscreen-view-descriptor');

var FullscreenViews = function(appId, driver){
	EventEmitter.call(this);

	this._appId = appId;
	this._driver = driver;
	this._fullscreenDescriptors = [];

	//this._setupNativeFullscreenViewDescriptors();
	this._watchForFullscreenViewChanges();
};

FullscreenViews.protoype = Object.create(EventEmitter.prototype);

_.extend(FullscreenViews.prototype, {

	getFullscreenViewDescriptor: function(name){
		return _.find(this._fullscreenDescriptors, function(fullscreenViewDescriptor){
			return fullscreenViewDescriptor.getName() === name;
		});
	},

	_setupNativeFullscreenViewDescriptors: function(){
		var nativeViewNames = this._driver.getNativeViewNames();

		var self = this;
		nativeViewNames.forEach(function(viewName){

			self._fullscreenDescriptors.push(
				new FullscreenViewDescriptor({
					name: viewName,
					isNative: true
				})
			);

		});
	},

	_watchForFullscreenViewChanges: function(){
		this._driver.getFullscreenViewDriverStream().onValue(this, '_handleFullscreenViewChange');
	},

	_handleFullscreenViewChange: function(event){
		var viewName = event.viewName;
		var params = event.params;

		/*if(this._driver.isThreadFullscreenView(viewName, params)){
			this._handleThreadFullscreenView(viewName, params);
		}
		else if(this._driver.isThreadListFullscreenView(viewName, params)){
			this._handleHandleThreadListFullscreenView(viewName, params);
		}
		else{
			this._handleOtherFullscreenView(viewName, params);
		}*/
	},

	_handleThreadFullscreenView: function(viewName, params){

	}

});

module.exports = FullscreenViews;
