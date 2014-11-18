var _ = require('lodash');

var Toolbars = function(platformImplementationLoader){
	this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(Toolbars.prototype, {

	registerThreadListNoSelectionsButton: function(buttonDescriptor){
		this._platformImplementationLoader.load().then(function(platformImplementation){
			platformImplementation.Toolbars.registerThreadListNoSelectionsButton(buttonDescriptor);
		});
	},

	registerThreadListWithSelectionsButton: function(buttonDescriptor){
		this._platformImplementationLoader.load().then(function(platformImplementation){
			platformImplementation.Toolbars.registerThreadListWithSelectionsButton(buttonDescriptor);
		});
	},

	registerThreadViewButton: function(buttonDescriptor){
		this._platformImplementationLoader.load().then(function(platformImplementation){
			platformImplementation.Toolbars.registerThreadViewButton(buttonDescriptor);
		});
	},

	registerThreadListNoSelectionsMoreItem: function(buttonDescriptor){
		this._platformImplementationLoader.load().then(function(platformImplementation){
			platformImplementation.Toolbars.registerThreadListNoSelectionsMoreItem(buttonDescriptor);
		});
	},

	registerThreadListWithSelectionsMoreItem: function(buttonDescriptor){
		this._platformImplementationLoader.load().then(function(platformImplementation){
			platformImplementation.Toolbars.registerThreadListWithSelectionsMoreItem(buttonDescriptor);
		});
	},

	registerThreadViewMoreItem: function(buttonDescriptor){
		this._platformImplementationLoader.load().then(function(platformImplementation){
			platformImplementation.Toolbars.registerThreadViewMoreItem(buttonDescriptor);
		});
	}

});

module.exports = Toolbars;
