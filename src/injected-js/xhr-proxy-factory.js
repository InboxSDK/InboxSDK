/*jslint node: true */
'use strict';
var _ = require('lodash');
var assert = require('assert');
var RSVP = require('rsvp');
var EventEmitter = require('events').EventEmitter;
var deparam = require('querystring').parse;

/**
 * Creates a drop-in replacement for the XMLHttpRequest constructor that can
 * have wrappers which may log or modify server responses. See
 * test/xhrproxy.js for usage examples and tests.
 * @function XHRProxyFactory
 * @param {function} XHR - original XMLHttpRequest constructor to wrap
 * @param {XHRProxyWrapper[]} wrappers - mutable array
 * @param {Object} [opts] - Can specify a logError function
 * @returns {function} wrapped XMLHttpRequest-like constructor
 */
module.exports = function(XHR, wrappers, opts) {

  var logError = opts && opts.logError || function(error, label) {
    setTimeout(function() {
      // let window.onerror log this
      throw error;
    }, 1);
  };

  function transformEvent(oldTarget, newTarget, event) {
    var newEvent = {};
    Object.keys(event).concat([
      'bubbles', 'cancelBubble', 'cancelable',
      'defaultPrevented',
      'preventDefault',
      'stopPropagation',
      'stopImmediatePropagation',
      'lengthComputable', 'loaded', 'total',
      'type',
      'currentTarget', 'target',
      'srcElement',
      'NONE', 'CAPTURING_PHASE', 'AT_TARGET', 'BUBBLING_PHASE',
      'eventPhase'
    ]).filter(name => name in event).forEach(name => {
      const value = event[name];
      if (value === oldTarget) {
        newEvent[name] = newTarget;
      } else if (typeof value === 'function') {
        newEvent[name] = value.bind(event);
      } else {
        newEvent[name] = value;
      }
    });
    return newEvent;
  }

  function wrapEventListener(oldTarget, newTarget, listener) {
    return function(event) {
      return listener.call(newTarget, transformEvent(oldTarget, newTarget, event));
    };
  }

  function findApplicableWrappers(wrappers, connection) {
    return _.filter(wrappers, function(wrapper) {
      try {
        return wrapper.isRelevantTo(connection);
      } catch(e) { logError(e); }
    });
  }

  /**
   * Object with information about the connection in progress. Its fields are
   * populated as the connection goes on. The object is passed as the first
   * argument to all of the wrappers. The object is mutable so the wrappers can
   * add properties to it.
   *
   * @typedef {Object} XHRProxyConnectionDetails
   * @property {string} method
   * @property {string} url
   * @property {Object} params - parameters decoded from the URL
   * @property {string} originalSendBody - data passed to send method
   * @property {number} status - HTTP response status
   * @property {string} [originalResponseText] - Is not set if responseType is set
   *  to a value besides 'text'.
   * @property {string} [modifiedResponseText]
   */

  /**
   * Thing
   *
   * @callback XHRProxyWrapperCallback
   * @param {XHRProxyConnectionDetails} connection
   */

  /**
   * Wrapper object contains optional callbacks that get run for completed
   * requests, and a required isRelevantTo method that filters what types of
   * requests the methods should be called for. All methods are passed an object
   * with details about the connection as the first argument. Some methods are
   * called with a relevant second argument (which is also present within the
   * connection argument).
   *
   * @typedef {Object} XHRProxyWrapper
   * @property {XHRProxyWrapperCallback} isRelevantTo - returns true if wrapper should be used
   *  for request.
   * @property {XHRProxyWrapperCallback} [originalSendBodyLogger] - called with value passed to
   *  send.
   * @property {XHRProxyWrapperCallback} [requestChanger] - Allows the protocol, URL, and body
   *  to be changed together before the connection is opened and sent.
   * @property {XHRProxyWrapperCallback} [originalResponseTextLogger] - called with the responseText as
   *  given by the server. Is not called if responseType is set to a value besides 'text'.
   * @property {XHRProxyWrapperCallback} [responseTextChanger] - called with the responseText as given
   *  by the server and returns new responseText value. Is not called if responseType
   * is set to a value besides 'text'.
   * @property {XHRProxyWrapperCallback} [finalResponseTextLogger] - called with the responseText as
   *  delivered to application code. Is not called if responseType is set to a value besides 'text'.
   * @property {XHRProxyWrapperCallback} [afterListeners] - called after all event listeners
   *  for readystatechange have run
   */

  function XHRProxy() {
    this._wrappers = wrappers;
    this._listeners = {};
    this._boundListeners = {};
    this._events = new EventEmitter(); // used for internal stuff, not user-visible events
    this.responseText = '';

    if (XHR.bind && XHR.bind.apply) {
      // call constructor with variable number of arguments
      this._realxhr = new (XHR.bind.apply(XHR, [null].concat(arguments)))();
    } else {
      // Safari's XMLHttpRequest lacks a bind method, but its constructor
      // doesn't support extra arguments anyway, so don't bother logging an
      // error here.
      this._realxhr = new XHR();
    }
    var self = this;

    function triggerEventListeners(name, event) {
      if (self['on'+name]) {
        try {
          wrapEventListener(self._realxhr, self, self['on'+name]).call(self, event);
        } catch(e) { logError(e, 'XMLHttpRequest event listener error'); }
      }

      _.each(self._boundListeners[name], function(boundListener) {
        try {
          boundListener(event);
        } catch(e) { logError(e, 'XMLHttpRequest event listener error'); }
      });
    }

    function runRscListeners(event) {
      triggerEventListeners('readystatechange', event);
    }

    this._fakeRscEvent = function() {
      runRscListeners(Object.freeze({
        bubbles: false, cancelBubble: false, cancelable: false,
        defaultPrevented: false,
        preventDefault: _.noop,
        stopPropagation: _.noop,
        stopImmediatePropagation: _.noop,
        type: 'readystatechange',
        currentTarget: this, target: this,
        srcElement: this,
        NONE: 0, CAPTURING_PHASE: 1, AT_TARGET: 2, BUBBLING_PHASE: 3,
        eventPhase: 0
      }));
    };

    function deliverFinalRsc(event) {
      self.readyState = 4;
      // Remember the status now before any event handlers are called, just in
      // case one aborts the request.
      var wasSuccess = self.status == 200;
      var progressEvent = _.extend({}, transformEvent(self._realxhr, self, event), {
        lengthComputable: false, loaded: 0, total: 0
      });

      var supportsResponseText = !self._realxhr.responseType || self._realxhr.responseType == 'text';

      if (supportsResponseText) {
        _.each(self._activeWrappers, function(wrapper) {
          if (wrapper.finalResponseTextLogger) {
            try {
              wrapper.finalResponseTextLogger(
                self._connection, self.responseText);
            } catch(e) { logError(e); }
          }
        });
      }

      runRscListeners(event);
      if (wasSuccess) {
        triggerEventListeners('load', progressEvent);
      } else {
        triggerEventListeners('error', progressEvent);
      }
      triggerEventListeners('loadend', progressEvent);

      _.each(self._activeWrappers, function(wrapper) {
        if (wrapper.afterListeners) {
          try {
            wrapper.afterListeners(self._connection);
          } catch(e) { logError(e); }
        }
      });
    }

    this._realxhr.addEventListener('readystatechange', function(event) {
      if (!self._connection) {
        return;
      }
      if (self._realxhr.readyState >= 2) {
        self._connection.status = self._realxhr.status;
      }

      var supportsResponseText = !self._realxhr.responseType || self._realxhr.responseType == 'text';

      // Process the response text.
      if (self._realxhr.readyState == 4) {
        if (supportsResponseText) {
          Object.defineProperty(self._connection, 'originalResponseText', {
            enumerable: true, writable: false, configurable: false,
            value: self._realxhr.responseText
          });

          _.each(self._activeWrappers, function(wrapper) {
            if (wrapper.originalResponseTextLogger) {
              try {
                wrapper.originalResponseTextLogger(
                  self._connection, self._connection.originalResponseText);
              } catch (e) { logError(e); }
            }
          });

          var finish = _.once(deliverFinalRsc.bind(null, event));
          if (self._connection.async) {
            // If the XHR object is re-used for another connection, then we need
            // to make sure that our upcoming async calls here do nothing.
            // Remember the current connection object, and do nothing in our async
            // calls if it no longer matches.
            var startConnection = self._connection;

            self._responseTextChangers.reduce(function(promise, nextResponseTextChanger) {
              return promise.then(function(modifiedResponseText) {
                if (startConnection === self._connection) {
                  self._connection.modifiedResponseText = modifiedResponseText;
                  return nextResponseTextChanger(self._connection, modifiedResponseText);
                }
              }).then(function(modifiedResponseText) {
                if (typeof modifiedResponseText != 'string') {
                  throw new Error("responseTextChanger returned non-string value "+modifiedResponseText);
                } else {
                  return modifiedResponseText;
                }
              });
            }, RSVP.resolve(self._connection.originalResponseText)).then(function(modifiedResponseText) {
              if (startConnection === self._connection) {
                self.responseText = self._connection.modifiedResponseText = modifiedResponseText;
                finish();
              }
            }, function(err) {
              logError(err);
              if (startConnection === self._connection) {
                self.responseText = self._realxhr.responseText;
                finish();
              }
            }).catch(logError);
            return;
          } else {
            self.responseText = self._realxhr.responseText;
          }
        } else {
          self.responseText = '';
        }

        deliverFinalRsc(event);
      } else {
        if (self._realxhr.readyState == 1 && self.readyState == 1) {
          // Delayed open+send just happened. We already delivered an event
          // for this, so drop this event.
          return;
        } else if (self._realxhr.readyState >= 3 && supportsResponseText) {
          if (self._responseTextChangers.length) {
            // If we're going to transform the final response, then we don't
            // want to expose any partial untransformed responses and we don't
            // want to bother trying to transform partial responses. Only show
            // an empty string as the loaded response until the connection is
            // done.
            self.responseText = '';
          } else {
            self.responseText = self._realxhr.responseText;
          }
        } else {
          self.responseText = '';
        }

        self.readyState = self._realxhr.readyState;
        runRscListeners(event);
      }
    }, false);

    [
      'dispatchEvent',
      'getAllResponseHeaders','getResponseHeader','overrideMimeType',
      'responseType','responseXML','responseURL','status','statusText',
      'timeout','ontimeout','onloadstart','onprogress','onabort',
      'upload','withCredentials'
    ].forEach(function(prop) {
      Object.defineProperty(self, prop, {
        enumerable: true, configurable: false,
        get: function() {
          // If we give the original native methods directly, they'll be called
          // with `this` as the XHRProxy object, which they aren't made for.
          if (typeof self._realxhr[prop]=='function') {
            return self._realxhr[prop].bind(self._realxhr);
          }
          return self._realxhr[prop];
        },
        set: function(v) {
          if (typeof v == 'function') {
            v = wrapEventListener(this._realxhr, this, v);
          }
          self._realxhr[prop] = v;
        }
      });
    });

    Object.defineProperty(self, 'response', {
      enumerable: true, configurable: false,
      get: function() {
        if (!this._realxhr.responseType || this._realxhr.responseType == 'text') {
          return this.responseText;
        } else {
          // We're not trying to transform non-text responses currently.
          return this._realxhr.response;
        }
      }
    });

    self.readyState = self._realxhr.readyState;
  }

  XHRProxy.prototype.abort = function() {
    // Important: If the request has already been sent, the XHR will change
    // its readyState to 4 after abort. However, we sometimes asynchronously
    // delay send calls. If the application has already called send but we
    // haven't sent off the real call yet, then we need to hurry up and send
    // something before the abort so that the readyState change happens.
    if (this._clientStartedSend && !this._realStartedSend) {
      if (this.readyState != 0 && this._realxhr.readyState == 0) {
        this._realxhr.open(this._connection.method, this._connection.url);
      }
      this._realStartedSend = true;
      this._realxhr.send();
    }
    this._realxhr.abort();
  };

  XHRProxy.prototype.setRequestHeader = function(name, value) {
    var self = this;
    if (this.readyState != 1) {
      throw new Error("Can't set headers now at readyState "+this.readyState);
    }
    if (this._connection.async && this._requestChangers.length) {
      this._events.once('realOpen', function() {
        self._realxhr.setRequestHeader(name, value);
      });
    } else {
      this._realxhr.setRequestHeader(name, value);
    }
  };

  XHRProxy.prototype.addEventListener = function(name, listener) {
    if (!this._listeners[name]) {
      this._listeners[name] = [];
      this._boundListeners[name] = [];
    }
    if (!_.includes(this._listeners[name], listener)) {
      var boundListener = wrapEventListener(this._realxhr, this, listener);
      this._listeners[name].push(listener);
      this._boundListeners[name].push(boundListener);
      if (!_.includes(['readystatechange', 'load', 'error', 'loadend'], name)) {
        // certain listeners are called manually so that the final
        // call (when readyState==4) can be delayed.
        this._realxhr.addEventListener(name, boundListener, false);
      }
    }
  };

  XHRProxy.prototype.removeEventListener = function(name, listener) {
    if (!this._listeners[name]) {
      return;
    }
    var i = this._listeners[name].indexOf(listener);
    if (i == -1) {
      return;
    }
    this._listeners[name].splice(i, 1);
    var boundListener = this._boundListeners[name].splice(i, 1)[0];
    if (name != 'readystatechange') {
      this._realxhr.removeEventListener(name, boundListener, false);
    }
  };

  XHRProxy.prototype.open = function(method, url, async) {
    // Work around MailTrack issue
    if (!(this instanceof XHRProxy)) {
      return XHR.prototype.open.apply(this, arguments);
    }

    var self = this;
    this._connection = {
      method: method,
      url: url,
      params: deparam(url.split('?')[1] || ''),
      async: arguments.length < 3 || !!async
    };
    this._clientStartedSend = false;
    this._realStartedSend = false;
    this._activeWrappers = findApplicableWrappers(this._wrappers, this._connection);
    this._responseTextChangers = this._activeWrappers.map(function(wrapper) {
      return wrapper.responseTextChanger && wrapper.responseTextChanger.bind(wrapper);
    }).filter(Boolean);
    this.responseText = '';

    function finish(method, url) {
      return self._realxhr.open(method, url, self._connection.async);
    }

    if (this._connection.async) {
      this._requestChangers = this._activeWrappers.map(function(wrapper) {
        return wrapper.requestChanger && wrapper.requestChanger.bind(wrapper);
      }).filter(Boolean);
      if (this._requestChangers.length) {
        if (this.readyState != 1) {
          this.readyState = 1;
          this._fakeRscEvent();
        }
      } else {
        finish(method, url);
      }
    } else {
      finish(method, url);
    }
  };

  XHRProxy.prototype.send = function(body) {
    var self = this;
    this._clientStartedSend = true;
    Object.defineProperty(this._connection, 'originalSendBody', {
      enumerable: true, writable: false, configurable: false, value: body
    });
    this._connection.responseType = this._realxhr.responseType || 'text';

    _.each(self._activeWrappers, function(wrapper) {
      if (wrapper.originalSendBodyLogger) {
        try {
          wrapper.originalSendBodyLogger(
            self._connection, body);
        } catch (e) { logError(e); }
      }
    });

    function finish(body) {
      self._realStartedSend = true;
      self._realxhr.send(body);
    }

    if (this._connection.async && this._requestChangers.length) {
      // If the XHR object is re-used for another connection, then we need
      // to make sure that our upcoming async calls here do nothing.
      // Remember the current connection object, and do nothing in our async
      // calls if it no longer matches. Also check for aborts.
      var startConnection = this._connection;

      var request = {
        method: this._connection.method,
        url: this._connection.url,
        body: body
      };
      this._requestChangers.reduce(function(promise, nextRequestChanger) {
        return promise.then(function(modifiedRequest) {
          if (startConnection === self._connection && !self._realStartedSend) {
            assert(_.has(modifiedRequest, 'method'), 'modifiedRequest has method');
            assert(_.has(modifiedRequest, 'url'), 'modifiedRequest has url');
            assert(_.has(modifiedRequest, 'body'), 'modifiedRequest has body');
            return nextRequestChanger(self._connection, Object.freeze(modifiedRequest));
          }
        });
      }, RSVP.Promise.resolve(request)).then(function(modifiedRequest) {
        if (startConnection === self._connection && !self._realStartedSend) {
          assert(_.has(modifiedRequest, 'method'), 'modifiedRequest has method');
          assert(_.has(modifiedRequest, 'url'), 'modifiedRequest has url');
          assert(_.has(modifiedRequest, 'body'), 'modifiedRequest has body');
          return modifiedRequest;
        }
      }).catch(function(err) {
        logError(err);
        return request;
      }).then(function(modifiedRequest) {
        if (startConnection === self._connection && !self._realStartedSend) {
          self._realxhr.open(modifiedRequest.method, modifiedRequest.url);
          self._events.emit('realOpen');
          finish(modifiedRequest.body);
        }
      });
    } else {
      finish(body);
    }
  };

  [XHRProxy, XHRProxy.prototype].forEach(function(obj) {
    _.extend(obj, {
      UNSENT: 0,
      OPENED: 1,
      HEADERS_RECEIVED: 2,
      LOADING: 3,
      DONE: 4
    });
  });

  return XHRProxy;
};
