/* @flow */
//jshint ignore:start

export default function fakeWindowResize() {
  var event = document.createEvent("HTMLEvents");
  event.initEvent("resize", true, false);
  window.dispatchEvent(event);
}
