/* @flow */
//jshint ignore:start

const r = /([?&])_=[^&]*/;
let nonce = Date.now() + Math.floor(Math.random() * Math.pow(2, 32));

export default function cachebustUrl(url: string): string {
  if (r.test(url)) {
    return url.replace(r, "$1_=" + nonce++)
  } else {
    return url + (/\?/.test(url) ? "&" : "?") + "_=" + nonce++;
  }
}
