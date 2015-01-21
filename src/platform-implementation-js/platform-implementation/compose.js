'use strict';

var _ = require('lodash');
var RSVP = require('rsvp');

var Map = require('es6-unweak-collections').Map;

var ComposeView = require('../views/compose-view');
var HandlerRegistry = require('../lib/handler-registry');

var memberMap = new Map();

/**
* @class
* This namespace contains methods and types related to adding your application elements to the Gmail or Inbox Compose UI.
* The compose UI has two variants. The New Compose UI appears when users are composing new messages and appear as windows
* above the rest of the app content. The second, Inline Reply UI, appears when users are replying to existing messages inline
* with the message they are replying to.
*
* The <code>ComposeView</code> type is how you interact with compose windows in Gmail and Inbox. The most common way to get
* access to a compose view is to use the <code>InboxSDK.Compose.registerComposeViewHandler</code> method which calls you back
* with every existing <code>ComposeView</code> and all future <code>ComposeView</code>s. From there a typical application will
* modify the <code>ComposeView</code> as needed by adding buttons, adding content to the message or accessing the recipient data.
* See <code><a href="#compose_view">ComposeView</a></code> for a more comprehensive listing.
*/
var Compose = function(appId, driver){
    var members = {};
    memberMap.set(this, members);

    members.appId = appId;
    members.driver = driver;

    members.requestedComposeViewDeferred = null;

    members.handlerRegistry = new HandlerRegistry();
    _setupComposeViewDriverWatcher(members);
};

_.extend(Compose.prototype, /** @lends Compose */ {

  /**
  * Register a handler to be called for every existing ComposeView as well as for all future ComposeViews
  * that may come into existence. This method is the preferred way to add your application to every compose
  * area such as a new compose window or inline reply compose areas. This function returns another function
  * that can be used to unregister - simply call the function to unregister this handler.
  *
  * @param handler {function(ComposeView)} the function to be called
  * @return {function} a function to call when you want to unregister this handler
  */
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
