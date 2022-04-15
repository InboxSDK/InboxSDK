interface Headers {
  [name: string]: string | number;
}

export interface Filter {
  method: string;
  path: string;
  responseType?: string;
  body?: any;
  headers?: Headers;
}

export interface Responder {
  status: number;
  response?: any;
  headers?: Headers;
  delay?: number | null;
  noDelay?: boolean;
}

interface FilterResponderPair {
  filter: Filter;
  responder: Responder;
}

function makeEvent(self: any, isProgressEvent?: boolean) {
  const props = {
    currentTarget: { value: self },
    target: { value: self },
    srcElement: { value: self },
    timeStamp: { value: Date.now() },
    type: { value: 'readystatechange' },
  };
  if (isProgressEvent) {
    Object.assign(props, {
      lengthComputable: { value: self._lengthComputable },
      loaded: { value: self._loaded },
      total: { value: self._total },
    });
  }
  return Object.freeze(Object.defineProperties({}, props));
}

function checkResponderFilter(
  filter: Filter,
  method: string,
  path: string,
  responseType: string,
  requestHeaders: { [name: string]: any },
  body: string | undefined
) {
  if (filter.method && filter.method != method) {
    return false;
  }

  if (filter.path && filter.path != path) {
    return false;
  }

  if (filter.responseType && filter.responseType != responseType) {
    return false;
  }

  if ('body' in filter && filter.body != body) {
    return false;
  }

  if (
    !Object.entries(filter.headers || {}).every(
      ([name, value]) => name in requestHeaders && requestHeaders[name] == value
    )
  ) {
    return false;
  }

  return true;
}

const defaultResponder: Responder = {
  status: 404,
  headers: { 'Content-Type': 'text/plain' },
  response: 'Content not found',
  delay: null,
  noDelay: false,
};

const statusTextCodes: { [status: string]: string } = {
  '0': 'unknown',
  '200': 'OK',
  '404': 'not found',
};

function selectResponder(
  responders: FilterResponderPair[],
  method: string,
  path: string,
  responseType: string,
  requestHeaders: { [name: string]: any },
  body: string | undefined
): Responder {
  const foundPair = responders.find((pair) =>
    checkResponderFilter(
      pair.filter,
      method,
      path,
      responseType,
      requestHeaders,
      body
    )
  );
  if (foundPair == null) {
    return defaultResponder;
  } else {
    return foundPair.responder;
  }
}

function lowercaseHeaderNames(headers: Headers | undefined) {
  const newHeaders: Headers = {};
  Object.entries(headers || {}).forEach(([name, value]) => {
    newHeaders[name.toLowerCase()] = value;
  });
  return newHeaders;
}

export default class MockServer {
  private _verbose: boolean = false;
  private _responders: Array<any> = [];
  public XMLHttpRequest: typeof XMLHttpRequest;

  public constructor() {
    const server = this;

    this.XMLHttpRequest = class XMLHttpRequest {
      private _server: MockServer = server;
      private _readyState: number = 0;
      private _listeners: { [name: string]: Function[] } = {};
      private _requestHeaders: { [name: string]: string } = {};
      private _sendFlag: boolean = false;

      private _response: string | undefined = undefined;
      private _responseXML: any = undefined;
      private _status: number | undefined = undefined;
      private _statusText: string | undefined = undefined;

      private _responder: any;
      private _timer: any = undefined;
      private _method: string | undefined;
      private _path: string | undefined;
      private _async: boolean | undefined;
      private _body: string | undefined;
      private _loaded: number = 0;
      private _total: number = 0;
      private _lengthComputable: boolean | undefined;

      public responseType: string | null | undefined;

      public constructor() {
        [
          'readyState',
          'response',
          'responseText',
          'responseXML',
          'status',
          'statusText',
        ].forEach((prop) => {
          Object.defineProperty(this, prop, {
            configurable: false,
            enumerable: true,
            get() {
              // Safari throws exceptions when you read some properties too early.
              if (
                (this._readyState < 2 && prop.match(/^status/)) ||
                (this._readyState < 3 && prop.match(/^response/))
              ) {
                throw new Error(prop + " can't be accessed yet");
              }
              if (prop == 'responseText') {
                if (this.responseType && this.responseType != 'text') {
                  throw new Error(
                    "The value is only accessible if the object's 'responseType' " +
                      "is '' or 'text' (was '" +
                      this.responseType +
                      "')."
                  );
                }
                return this._response;
              }
              return (this as any)['_' + prop];
            },
            set() {
              throw new Error('Can not modify read-only property ' + prop);
            },
          });
        });
      }

      public open(
        method: string,
        path: string,
        async: boolean | undefined = undefined
      ) {
        if (this._server._verbose) {
          console.log('Connection opened', method, path); //eslint-disable-line no-console
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

      public _terminate() {
        if (this._timer != null) clearTimeout(this._timer);
      }

      public abort() {
        this._terminate();
        if (this._readyState !== 0 && this._readyState !== 4) {
          this._readyState = 4;
          this._status = 0;
          this._statusText = 'aborted';
          if (this._responder.partialResponse != null) {
            this._response = this._responder.partialResponse;
            this._loaded = this._response!.length || 0;
          } else if (!this.responseType || this.responseType === 'text') {
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

      public send(body: any) {
        this._body = body;
        this._sendFlag = true;
        if (this._readyState != 1)
          throw new Error('Invalid state ' + this._readyState);

        this._responder = selectResponder(
          this._server._responders,
          this._method!,
          this._path!,
          this.responseType || 'text',
          this._requestHeaders,
          body
        );

        const delay = this._responder.delay;
        const noDelay = this._responder.noDelay;

        const step = (fn: () => void) => {
          if (this._async) {
            if (delay != null) {
              return setTimeout(fn, delay);
            } else if (noDelay) {
              fn();
            } else {
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
          this._statusText =
            this._responder.statusText || statusTextCodes[this._status!];
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
            this._loaded = this._response!.length || 0;
          } else if (!this.responseType || this.responseType === 'text') {
            this._response = '';
          }
          this._callListeners('readystatechange', makeEvent(this));
          this._timer = step(done);
        };
        const done = () => {
          this._readyState = 4;

          let response;
          if (typeof this._responder.responseFunction === 'function') {
            response = this._responder.responseFunction(
              this._method,
              this._path,
              this._requestHeaders,
              this._body
            );
          } else {
            response = this._responder.response;
          }
          if (this.responseType === 'json') {
            try {
              response = JSON.parse(response);
            } catch {
              response = null;
            }
          }
          this._response = response;

          this._responseXML = this._responder.responseXML;
          this._loaded = (this._response && this._response.length) || 0;
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

      private _callListeners(name: string, event: any) {
        if ((this as any)['on' + name]) {
          (this as any)['on' + name](event);
        }
        for (const listener of this._listeners[name] || []) {
          listener.call(this, event);
        }
      }

      public setRequestHeader(header: string, value: string) {
        if (this._readyState != 1 || this._sendFlag) {
          throw new Error(
            "Can't set headers now at readyState " + this._readyState
          );
        }
        this._requestHeaders[header.toLowerCase()] = value;
      }

      public getResponseHeader(header: string) {
        if (this._readyState < 2) {
          return null;
        }
        header = header.toLowerCase();
        if (this._responder.headers[header] != null) {
          return this._responder.headers[header];
        }
        return null;
      }

      public getAllResponseHeaders() {
        if (this._readyState < 2) {
          return null;
        }
        return Object.entries(this._responder.headers || {})
          .map(([name, value]) => name + ': ' + value + '\n')
          .join('');
      }

      public addEventListener(name: string, listener: Function) {
        if (!this._listeners[name]) {
          this._listeners[name] = [];
        }
        if (!this._listeners[name].includes(listener)) {
          this._listeners[name].push(listener);
        }
      }

      public removeEventListener(name: string, listener: Function) {
        if (this._listeners[name]) {
          this._listeners[name] = this._listeners[name].filter(
            (l) => l !== listener
          );
        }
      }
    } as any;

    [this.XMLHttpRequest, this.XMLHttpRequest.prototype].forEach((obj) => {
      Object.assign(obj, {
        UNSENT: 0,
        OPENED: 1,
        HEADERS_RECEIVED: 2,
        LOADING: 3,
        DONE: 4,
      });
    });
  }

  public respondWith(filter: Filter, responder: Responder) {
    filter.headers = lowercaseHeaderNames(filter.headers);
    responder.headers = lowercaseHeaderNames(responder.headers);

    this._responders.push({ filter, responder });
  }

  public setVerbose(verbose: boolean) {
    this._verbose = verbose;
  }
}
