/* @flow */
//jshint ignore:start

// a wrapper around console.warn that makes sure not to repeat itself.
var pastWarnings: Set<string> = new Set();

export default function depWarn(...args: any[]) {
  var str = args.join();
  if (!pastWarnings.has(str)) {
    pastWarnings.add(str);
    console.warn('InboxSDK:', ...args);
  }
}
