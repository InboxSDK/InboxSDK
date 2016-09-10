/* @flow */

export default function fakeWindowResize() {
  var event = document.createEvent("HTMLEvents");
  (event: any).initEvent("resize", true, false);
  window.dispatchEvent(event);
}
