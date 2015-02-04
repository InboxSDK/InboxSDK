module.exports = function() {
  document.head.setAttribute('data-inboxsdk-user-email-address', GLOBALS[10]);
  document.head.setAttribute('data-inboxsdk-user-language', GLOBALS[4].split('.')[1]);
};
