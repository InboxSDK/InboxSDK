'use strict';

var _ = require('lodash');
var RSVP = require('rsvp');

var Map = require('es6-unweak-collections').Map;

var ComposeView = require('../views/compose-view');
var HandlerRegistry = require('../lib/handler-registry');

var memberMap = new Map();

var Compose = function(appId, driver){
    var members = {};
    memberMap.set(this, members);

    members.appId = appId;
    members.driver = driver;

    members.requestedComposeViewDeferred = null;

    members.handlerRegistry = new HandlerRegistry();
    _setupComposeViewDriverWatcher(members);
};

_.extend(Compose.prototype, {

    registerComposeViewHandler: function(handler){
        return memberMap.get(this).handlerRegistry.registerHandler(handler);
    },

    getComposeView: function(){
        var members = memberMap.get(this);
        members.requestedComposeViewDeferred = RSVP.defer();

        members.driver.openComposeWindow();

        _createIgnoreComposeSignal();

        return members.requestedComposeViewDeferred.promise;
    }

});


function _setupComposeViewDriverWatcher(members){
    members.driver.getComposeViewDriverStream().onValue(function(viewDriver){
        var view = new ComposeView(viewDriver, members.appId);

        if(members.requestedComposeViewDeferred){
            var deferred = members.requestedComposeViewDeferred;
            members.requestedComposeViewDeferred = null;
            _removeIgnoreComposeSignal();
            deferred.resolve(view);
        }
        else if(!_doesIgnoreComposeSignalExist()){
            members.handlerRegistry.addTarget(view);
        }
    });

}

function _createIgnoreComposeSignal(){
    var signalDiv = document.createElement('div');
    signalDiv.id = 'inboxsdk__ignoreCompose';

    document.body.appendChild(signalDiv);
}

function _removeIgnoreComposeSignal(){
    setTimeout(function(){
        var signalDiv = document.getElementById('inboxsdk__ignoreCompose');
        if(signalDiv){
            signalDiv.remove();
        }
    }, 1);
}

function _doesIgnoreComposeSignalExist(){
    var signalExists = !!document.getElementById('inboxsdk__ignoreCompose');

    return signalExists;
}


module.exports = Compose;
