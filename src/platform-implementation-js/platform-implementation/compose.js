'use strict';

var _ = require('lodash');
var ud = require('ud');
var RSVP = require('rsvp');
var Bacon = require('baconjs');

var ComposeView = require('../views/compose-view');
var HandlerRegistry = require('../lib/handler-registry');

var memberMap = ud.defonce(module, ()=>new WeakMap());

// documented in src/docs/
var Compose = function(appId, driver){
    var members = {};
    memberMap.set(this, members);

    members.appId = appId;
    members.driver = driver;

    members.handlerRegistry = new HandlerRegistry();
    driver.getStopper().onValue(() => {
      members.handlerRegistry.dumpHandlers();
    });
    members.composeViewStream = members.driver.getComposeViewDriverStream().map(viewDriver =>
      new ComposeView(driver, viewDriver, members.appId, members.composeViewStream)
    );

    members.composeViewStream.onValue(view => {
      members.handlerRegistry.addTarget(view);
    });
};

_.extend(Compose.prototype, {

  registerComposeViewHandler(handler){
    return memberMap.get(this).handlerRegistry.registerHandler(handler);
  },

  openNewComposeView(){
    return this.getComposeView();
  },

  openDraftByMessageID(messageID) {
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

  getComposeView(){
    var members = memberMap.get(this);
    var promise = members.composeViewStream.take(1).toPromise(RSVP.Promise);
    members.driver.openComposeWindow();
    return promise;
  }
});

Compose = ud.defn(module, Compose);

module.exports = Compose;
