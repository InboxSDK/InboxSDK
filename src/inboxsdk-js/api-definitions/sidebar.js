var _ = require('lodash');

var Sidebar = function(platformImplementationLoader){
    this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(Sidebar.prototype, {

    registerThreadSidebarViewHandler: function(handler){
        return this._platformImplementationLoader.registerHandler('Sidebar', 'ThreadSidebarView', handler);
    },

    registerMessageSidebarViewHandler: function(handler){
        return this._platformImplementationLoader.registerHandler('Sidebar', 'MessageSidebarView', handler);
    }

});

module.exports = Sidebar;
