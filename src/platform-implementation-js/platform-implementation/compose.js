var _ = require('lodash');
var RSVP = require('rsvp');

var EventEmitter = require('events').EventEmitter;

var ComposeView = require('../views/compose-view');

var Compose = function(appId, driver){
    EventEmitter.call(this);

    this._appId = appId;
    this._driver = driver;

    this._requestedComposeViewDeferred = null;

    this._setupComposeViewDriverWatcher();
};

Compose.prototype = Object.create(EventEmitter.prototype);

_.extend(Compose.prototype, {

    getComposeView: function(){
        this._requestedComposeViewDeferred = RSVP.defer();

        this._driver.openComposeWindow();

        this._createIgnoreComposeSignal();

        return this._requestedComposeViewDeferred.promise;
    },

    _setupComposeViewDriverWatcher: function(){

        var self = this;
        this._driver.getComposeViewDriverStream().onValue(function(viewDriver){
            var view = new ComposeView(viewDriver);

            if(self._requestedComposeViewDeferred){
                var deferred = self._requestedComposeViewDeferred;
                self._requestedComposeViewDeferred = null;
                self._removeIgnoreComposeSignal();
                deferred.resolve(view);
            }
            else if(!self._doesIgnoreComposeSignalExist()){
                self.emit('composeOpen', view);
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
