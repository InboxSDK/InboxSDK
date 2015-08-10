'use strict';

var _ = require('lodash');
var RSVP = require('rsvp');
var Bacon = require('baconjs');

var ComposeView = require('../views/compose-view');
var HandlerRegistry = require('../lib/handler-registry');

var memberMap = new WeakMap();

/**
* @class
* This namespace contains methods and types related to adding your application elements to the Gmail or Inbox Compose UI.
* The compose UI has two variants. The New Compose UI appears when users are composing new messages and appear as windows
* above the rest of the app content. The second, the Reply UI, appears when users are replying to existing messages
* from the message they are replying to. This namespace handles both of these variants equivalently.
*
* The {ComposeView} type is how you interact with compose windows in Gmail and Inbox. The most common way to get
* access to a compose view is to use the {Compose.registerComposeViewHandler()} method which calls you back
* with every existing {ComposeView} and all future {ComposeView}s. From there a typical application will
* modify the {ComposeView} as needed by adding buttons, adding content to the message, or accessing the recipient data.
*/
var Compose = function(appId, driver){
    var members = {};
    memberMap.set(this, members);

    members.appId = appId;
    members.driver = driver;

    members.requestedComposeViewDeferred = null;

    members.handlerRegistry = new HandlerRegistry();
    driver.getStopper().onValue(function() {
      members.handlerRegistry.dumpHandlers();
    });
    members.composeViewStream = members.driver.getComposeViewDriverStream().map(function(viewDriver){
        return new ComposeView(driver, viewDriver, members.appId);
    });

    members.composeViewStream.onValue(function(view){
        if(members.requestedComposeViewDeferred){
            var deferred = members.requestedComposeViewDeferred;
            members.requestedComposeViewDeferred = null;
            deferred.resolve(view);
        }

        members.handlerRegistry.addTarget(view);
    });
};

_.extend(Compose.prototype, /** @lends Compose */ {

  /**
  * Register a handler to be called for every existing ComposeView as well as for all future ComposeViews
  * that may come into existence. This method is the preferred way to add your application to every compose
  * area such as a new compose window or inline reply compose areas. This function returns another function
  * that can be used to unregister - simply call the function to unregister this handler.
  * @param {func(ComposeView)} handler - The function to be called.
  * @return {function} a function to call when you want to unregister this handler
  */
  registerComposeViewHandler: function(handler){
    return memberMap.get(this).handlerRegistry.registerHandler(handler);
  },

  /**
   * Opens a new compose view. Any handlers you've registered for ComposeViews will be called as well.
   * @return {Promise.<ComposeView>} a promise that will resolve to a ComposeView once the ComposeView has opened
   */
  openNewComposeView: function(){
    return this.getComposeView();
  },

  openDraftByMessageID: function(messageID) {
    var members = memberMap.get(this);
    var newComposePromise = members.composeViewStream
      .merge(Bacon.later(3000, null))
      .take(1)
      .flatMap(function(view) {
        return view ? Bacon.once(view) : new Bacon.Error(new Error("draft did not open"));
      })
      .toPromise(RSVP.Promise);
    members.driver.openDraftByMessageID(messageID);
    return newComposePromise;
  },

  getComposeView: function(){
      var members = memberMap.get(this);
      members.requestedComposeViewDeferred = RSVP.defer();
      members.driver.openComposeWindow();

      return members.requestedComposeViewDeferred.promise;
  }
});

module.exports = Compose;
