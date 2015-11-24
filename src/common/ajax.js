/* @flow */
//jshint ignore:start

const forOwn = require('lodash/object/forOwn');
import querystring from 'querystring';
import delay from './delay';
import cachebustUrl from './cachebust-url';

const MAX_TIMEOUT = 64*1000; //64 seconds
const MAX_RETRIES = 5;
const serversToIgnore = {};

// Simple ajax helper.
// opts:
// * url
// * [method]
// * [cachebust] - boolean
// * [headers] - object
// * [xhrFields] - object
// * [data]
export type ajaxOpts = {
  url: string;
  method?: ?string;
  cachebust?: ?boolean;
  headers?: ?{[index: string]: string};
  xhrFields?: ?Object;
  data?: ?{[index: string]: string}|string;
  retryNum?: number;
};

export type ajaxResponse = {
  text: string;
  xhr: XMLHttpRequest;
};

export default function ajax(opts: ajaxOpts): Promise<ajaxResponse> {
  if(!opts || typeof opts.url !== 'string') {
    throw new Error('URL must be given');
  }
  return new Promise(function(resolve, reject) {
    const method = opts.method ? opts.method : "GET";
    let url = opts.url;
    let stringData: ?string;
    if (opts.data) {
      stringData = typeof opts.data === "string" ? opts.data : querystring.stringify(opts.data);
      if (method === "GET" || method === "HEAD") {
        url += (/\?/.test(url) ? "&" : "?") + stringData;
        stringData = null;
      }
    }

    const match = url.match(/(?:(?:[a-z]+:)?\/\/)?([^/]*)\//);
    if (!match) {
      throw new Error("Failed to match url");
    }
    const server = match[1];
    if (Object.prototype.hasOwnProperty.call(serversToIgnore, server)) {
      reject(new Error(`Server at ${url} has told us to stop connecting`));
      return;
    }

    if (opts.cachebust) {
      url = cachebustUrl(url);
    }

    const xhr = new XMLHttpRequest();
    Object.assign(xhr, opts.xhrFields);
    xhr.onerror = function(event) {
      if ((opts.retryNum || 0) < MAX_RETRIES) {
        if (
          xhr.status === 502 ||
          ((xhr.status === 0 || xhr.status >= 500) && (method === "GET" || method === "HEAD"))
        ) {
          resolve(_retry(opts));
          return;
        }
      }

      const err = Object.assign((new Error(`Failed to load ${url}`): any), {
        event, xhr, status: xhr.status
      });

      // give a way for a server to tell us to go away for now. Good fallback
      // in case a bug ever causes clients to spam a server with requests.
      if (xhr.status == 490) {
        serversToIgnore[server] = true;
      }
      reject(err);
    };
    xhr.onload = function(event) {
      if (xhr.status === 200) {
        resolve({
          xhr,
          text: xhr.responseText
        });
      } else {
        xhr.onerror(event);
      }
    };
    xhr.open(method, url, true);
    forOwn(opts.headers, (value, name) => {
      xhr.setRequestHeader(name, value);
    });
    xhr.send(stringData);
  });
}

function _retry(opts: ajaxOpts): Promise<ajaxResponse>{
  const retryNum = (opts.retryNum || 0) + 1;

  // 2000 4000 8000...
  const retryTimeout = Math.min(Math.pow(2, retryNum)*1000, MAX_TIMEOUT);

  return delay(retryTimeout).then(() => ajax({...opts, retryNum}));
}
