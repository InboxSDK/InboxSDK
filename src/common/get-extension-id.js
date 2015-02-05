function getExtensionId() {
  if (typeof chrome != 'undefined' && chrome && chrome.extension && chrome.extension.getURL) {
    return chrome.extension.getURL('');
  }
  return null;
}

module.exports = getExtensionId;
