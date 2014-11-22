var _ = require('lodash');

function main() {
  console.log('injected main', _);
}

if (!global.__InboxSDKInjected) {
  global.__InboxSDKInjected = true;
  main();
}
