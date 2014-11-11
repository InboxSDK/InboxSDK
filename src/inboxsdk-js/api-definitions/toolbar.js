var _ = require('lodash');

var Toolbar = function(platformImplementationLoader){
	this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(Toolbar.prototype, {

	registerThreadListNoSelectionsButton: function(buttonDescriptor){
		this._platformImplementationLoader.load().then(function(platformImplementation){
			platformImplementation.Toolbar.registerThreadListNoSelectionsButton(buttonDescriptor);
		});
	},

	registerThreadListWithSelectionsButton: function(buttonDescriptor){
		this._platformImplementationLoader.load().then(function(platformImplementation){
			platformImplementation.Toolbar.registerThreadListWithSelectionsButton(buttonDescriptor);
		});
	},

	registerThreadViewButton: function(buttonDescriptor){
		this._platformImplementationLoader.load().then(function(platformImplementation){
			platformImplementation.Toolbar.registerThreadViewButton(buttonDescriptor);
		});
	},

	registerThreadListNoSelectionsMoreItem: function(buttonDescriptor){
		this._platformImplementationLoader.load().then(function(platformImplementation){
			platformImplementation.Toolbar.registerThreadListNoSelectionsMoreItem(buttonDescriptor);
		});
	},

	registerThreadListWithSelectionsMoreItem: function(buttonDescriptor){
		this._platformImplementationLoader.load().then(function(platformImplementation){
			platformImplementation.Toolbar.registerThreadListWithSelectionsMoreItem(buttonDescriptor);
		});
	},

	registerThreadViewMoreItem: function(buttonDescriptor){
		this._platformImplementationLoader.load().then(function(platformImplementation){
			platformImplementation.Toolbar.registerThreadViewMoreItem(buttonDescriptor);
		});
	}

});

module.exports = Toolbar;
