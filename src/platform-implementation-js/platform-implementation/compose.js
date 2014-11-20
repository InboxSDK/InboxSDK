var _ = require('lodash');
var RSVP = require('rsvp');
var BasicClass = require('../lib/basic-class');

var ComposeView = require('../views/compose-view');
var HandlerRegistry = require('../lib/handler-registry');

var Compose = function(appId, driver){
    BasicClass.call(this);

    this._appId = appId;
    this._driver = driver;

    this._requestedComposeViewDeferred = null;

    this._handlerRegistry = new HandlerRegistry();
    this._setupComposeViewDriverWatcher();
};

Compose.prototype = Object.create(BasicClass.prototype);

_.extend(Compose.prototype, {

    __memberVariables: [
        {name: '_appId', destroy: false},
        {name: '_driver', destroy: false},
        {name: '_requestedComposeViewDeferred', destroy: true, destroyFunction: 'reject'},
        {name: '_unsubscribeFunction', destroy: true},
        {name: '_handlerRegistry', destroy: true}
    ],

    getComposeView: function(){
        this._requestedComposeViewDeferred = RSVP.defer();

        this._driver.openComposeWindow();

        this._createIgnoreComposeSignal();

        return this._requestedComposeViewDeferred.promise;
    },

    registerComposeViewHandler: function(handler){
        this._handlerRegistry.registerHandler(handler);
    },

    _setupComposeViewDriverWatcher: function(){
        var self = this;
        this._unsubscribeFunction = this._driver.getComposeViewDriverStream().onValue(function(viewDriver){
            var view = new ComposeView(viewDriver, self._appId);

            if(self._requestedComposeViewDeferred){
                var deferred = self._requestedComposeViewDeferred;
                self._requestedComposeViewDeferred = null;
                self._removeIgnoreComposeSignal();
                deferred.resolve(view);
            }
            else if(!self._doesIgnoreComposeSignalExist()){
                self._handlerRegistry.addTarget(view);
            }
        });

    },

    _createIgnoreComposeSignal: function(){
        var signalDiv = document.createElement('div');
        signalDiv.id = 'inboxsdk__ignoreCompose';

        document.body.appendChild(signalDiv);
    },

    _removeIgnoreComposeSignal: function(){
        setTimeout(function(){
            var signalDiv = document.getElementById('inboxsdk__ignoreCompose');
            if(signalDiv){
                signalDiv.remove();
            }
        }, 1);
    },

    _doesIgnoreComposeSignalExist: function(){
        var signalExists = !!document.getElementById('inboxsdk__ignoreCompose');

        return signalExists;
    }

});

module.exports = Compose;
