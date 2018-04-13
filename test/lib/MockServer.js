/* @flow */

import _ from 'lodash';

function makeEvent(self, isProgressEvent) {
  const props = {
    currentTarget: {value:self},
    target: {value:self},
    srcElement: {value:self},
    timeStamp: {value:Date.now()},
    type: {value:'readystatechange'}
  };
  if (isProgressEvent) {
    _.assign(props, {
      lengthComputable: {value:self._lengthComputable},
      loaded: {value:self._loaded},
      total: {value:self._total}
    });
  }
  return Object.freeze(Object.defineProperties({}, props));
}

function checkResponderFilter(filter, method, path, responseType, requestHeaders, body) {
  if (filter.method && filter.method != method){
    return false;
  }

  if (filter.path && filter.path != path){
    return false;
  }

  if (filter.responseType && filter.responseType != responseType){
    return false;
  }

  if ('body' in filter && filter.body != body) {
    return false;
  }

  if (!_.every(filter.headers, (value, name) =>
    name in requestHeaders && requestHeaders[name] == value
  )) {
    return false;
  }


  return true;
}

const defaultResponder = {
  status: 404,
  headers: {"Content-Type": "text/plain"},
  response: "Content not found",
  delay: (null: ?number),
  noDelay: false
};

const statusTextCodes = {
  '0': 'unknown',
  '200': 'OK',
  '404': 'not found'
};

function selectResponder(responders, method, path, responseType, requestHeaders, body) {
  const foundPair = _.find(responders, pair =>
    checkResponderFilter(pair.filter, method, path, responseType, requestHeaders, body)
  );
  if(foundPair == null){
    return defaultResponder;
  }
  else{
    return foundPair.responder;
  }
}

function lowercaseHeaderNames(headers) {
  const newHeaders = {};
  _.each(headers, (value, name) => {
    newHeaders[name.toLowerCase()] = value;
  });
  return newHeaders;
}

export default class MockServer {
  _verbose: boolean = false;
  _responders: Array<Object> = [];
  XMLHttpRequest: typeof XMLHttpRequest;

  constructor() {
    const server = this;

    (this: any).XMLHttpRequest = class XMLHttpRequest {
      _server: MockServer = server;
      _readyState: number = 0;
      _listeners: Object = {};
      _requestHeaders: Object = {};
      _sendFlag: boolean = false;

      _response: ?string = undefined;
      _responseXML = undefined;
      _status: ?number = undefined;
      _statusText: ?string = undefined;

      _responder: Object;
      _timer: ?number = undefined;
      _method: string;
      _path: string;
      _async: boolean;
      _body: string;
      _loaded: number = 0;
      _total: number = 0;
      _lengthComputable: boolean;

      constructor() {
        [
          'readyState','response','responseText','responseXML','status','statusText'
        ].forEach(prop => {
          Object.defineProperty(this, prop, {
            configurable: false, enumerable: true,
            get() {
              // Safari throws exceptions when you read some properties too early.
              if ((this._readyState < 2 && prop.match(/^status/)) ||
                (this._readyState < 3 && prop.match(/^response/)))
              {
                throw new Error(prop+" can't be accessed yet");
              }
              if (prop == 'responseText') {
                if (this.responseType && this.responseType != 'text') {
                  throw new Error(
                    "The value is only accessible if the object's 'responseType' " +
                    "is '' or 'text' (was '"+this.responseType+"').");
                }
                return this._response;
              }
              return (this: any)['_'+prop];
            },
            set(v) {
              throw new Error("Can not modify read-only property "+prop);
            }
          });
        });
      }

      open(method: string, path: string, async: ?boolean=undefined) {
        if (this._server._verbose) {
          console.log("Connection opened", method, path); //eslint-disable-line no-console
        }
        this._terminate();
        this._sendFlag = false;
        this._method = method;
        this._path = path;
        this._async = arguments.length == 2 ? true : Boolean(async);
        this._lengthComputable = false;
        this._loaded = 0;
        this._total = 0;
        this._responseXML = null;
        if (this._readyState != 1) {
          this._readyState = 1;
          this._callListeners('readystatechange', makeEvent(this));
        }
      }

      _terminate() {
        clearTimeout(this._timer);
      }

      abort() {
        this._terminate();
        if (this._readyState !== 0 && this._readyState !== 4) {
          this._readyState = 4;
          this._status = 0;
          this._statusText = 'aborted';
          if (this._responder.partialResponse != null) {
            this._response = this._responder.partialResponse;
            this._loaded = this._response.length || 0;
          } else {
            this._response = '';
          }
          if (this._responder.total !== false && this._responder.response) {
            this._lengthComputable = true;
            this._total = this._responder.response.length;
          }
          this._callListeners('abort', makeEvent(this, true));
          this._callListeners('readystatechange', makeEvent(this));
          this._callListeners('loadend', makeEvent(this, true));
        }
      }

      send(body) {
        this._body = body;
        this._sendFlag = true;
        if (this._readyState != 1)
          throw new Error("Invalid state "+this._readyState);

        this._responder = selectResponder(
          this._server._responders, this._method, this._path,
          this.responseType || 'text', this._requestHeaders, body);

        const delay = this._responder.delay;
        const noDelay = this._responder.noDelay;

        const step = (fn) => {
          if (this._async) {
            if(delay != null){
                return setTimeout(fn, delay);
            }
            else if(noDelay){
              fn();
            }
            else{
                return setTimeout(fn, 0);
            }
          } else {
            fn();
          }
        };
        this._callListeners('loadstart', makeEvent(this, true));
        const headers = () => {
          this._readyState = 2;
          this._status = this._responder.status;
          this._statusText = this._responder.statusText || statusTextCodes[this._status];
          if (this._responder.total !== false && this._responder.response) {
            this._lengthComputable = true;
            this._total = this._responder.response.length;
          }
          this._callListeners('readystatechange', makeEvent(this));
          this._timer = step(loading);
        };
        const loading = () => {
          this._readyState = 3;
          if (this._responder.partialResponse != null) {
            this._response = this._responder.partialResponse;
            this._loaded = this._response.length || 0;
          } else {
            this._response = '';
          }
          this._callListeners('readystatechange', makeEvent(this));
          this._timer = step(done);
        };
        const done = () => {
          this._readyState = 4;

          if (typeof this._responder.responseFunction === 'function') {
            this._response = this._responder.responseFunction(this._method, this._path, this._requestHeaders, this._body);
          } else {
            this._response = this._responder.response;
          }

          this._responseXML = this._responder.responseXML;
          this._loaded = this._response && this._response.length || 0;
          this._callListeners('readystatechange', makeEvent(this));
          if (this._status == 200) {
            this._callListeners('load', makeEvent(this, true));
          } else {
            this._callListeners('error', makeEvent(this, true));
          }
          this._callListeners('loadend', makeEvent(this, true));
        };

        this._timer = step(headers);
      }

      _callListeners(name: string, event: Object) {
        if ((this: any)['on'+name])
          (this: any)['on'+name](event);

        _.each(this._listeners[name], listener => {
          listener.call(this, event);
        });
      }

      setRequestHeader(header: string, value: string) {
        if (this._readyState != 1 || this._sendFlag) {
          throw new Error("Can't set headers now at readyState "+this._readyState);
        }
        this._requestHeaders[header.toLowerCase()] = value;
      }

      getResponseHeader(header: string) {
        if (this._readyState < 2) {
          return null;
        }
        header = header.toLowerCase();
        if (this._responder.headers[header] != null)
          return this._responder.headers[header];
        return null;
      }

      getAllResponseHeaders() {
        if (this._readyState < 2) {
          return null;
        }
        return _.map(this._responder.headers, (value, name) => name+': '+value+'\n').join('');
      }

      addEventListener(name, listener) {
        if (!this._listeners[name])
          this._listeners[name] = [];
        if (!_.includes(this._listeners[name], listener))
          this._listeners[name].push(listener);
      }

      removeEventListener(name, listener) {
        if (this._listeners[name])
          this._listeners[name] = _.without(this._listeners[name], listener);
      }
    };

    [this.XMLHttpRequest, this.XMLHttpRequest.prototype].forEach(obj => {
      Object.assign((obj: any), {
        UNSENT: 0,
        OPENED: 1,
        HEADERS_RECEIVED: 2,
        LOADING: 3,
        DONE: 4
      });
    });
  }

  respondWith(filter: Object, responder: Object) {
    filter.headers = lowercaseHeaderNames(filter.headers);
    responder.headers = lowercaseHeaderNames(responder.headers);

    this._responders.push({filter: filter, responder: responder});
  }

  setVerbose(verbose: boolean) {
    this._verbose = verbose;
  }
}
