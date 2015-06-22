/* @flow */
//jshint ignore:start

export default function getExtensionId(): ?string {
  if (global.chrome && global.chrome.extension && global.chrome.extension.getURL) {
    return global.chrome.extension.getURL('');
  }
  return null;
}
