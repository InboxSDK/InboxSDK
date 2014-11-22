var _ = require('lodash');

var BasicClass = require('../lib/basic-class');


var ThreadSidebarView = require('../views/thread-sidebar-view');
var MessageSidebarView = require('../views/message-sidebar-view');

var HandlerRegistry = require('../lib/handler-registry');

var Sidebar = function(appId, driver){
    BasicClass.call(this);

    this._appId = appId;
    this._driver = driver;

    this._threadSidebarViewHandlerRegistry = new HandlerRegistry();
    this._messageSidebarViewHandlerRegistry = new HandlerRegistry();

    this._setupThreadViewDriverWatcher();
    this._setupMessageViewDriverWatcher();
};

Sidebar.prototype = Object.create(BasicClass.prototype);

_.extend(Sidebar.prototype, {

    __memberVariables:[
        {name: '_appId', destroy: false},
        {name: '_driver', destroy: false},
        {name: '_threadViewUnsubscribeFunction', destroy: true, defaultValue: []},
        {name: '_messageViewUnsubscribeFunction', destroy: true, defaultValue: []},
        {name: '_threadSidebarViewHandlerRegistry', destroy: true},
        {name: '_messageSidebarViewHandlerRegistry', destroy: true}
    ],

    registerThreadViewHandler: function(handler){
        return this._threadSidebarViewHandlerRegistry.registerHandler(handler);
    },

    registerMessageViewHandler: function(handler){
        return this._messageSidebarViewHandlerRegistry.registerHandler(handler);
    },

    _setupThreadViewDriverWatcher: function(){
        this._threadViewUnsubscribeFunction = this._setupViewDriverWatcher('getThreadSidebarViewDriverStream', ThreadView, this._threadSidebarViewHandlerRegistry);
    },

    _setupMessageViewDriverWatcher: function(){
        this._messageViewUnsubscribeFunction = this._setupViewDriverWatcher('getMessageSidebarViewDriverStream', MessageView, this._messageSidebarViewHandlerRegistry);
    },

    _setupViewDriverWatcher: function(driverStreamGetFunction, viewClass, handlerRegistry){
        var self = this;
        return this._driver[driverStreamGetFunction]().onValue(function(viewDriver){
            var view = new viewClass(viewDriver, self._driver);
            handlerRegistry.addTarget(view);
        });
    }

});

module.exports = Sidebar;
