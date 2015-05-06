export default function fakeWindowResize() {
  const event = document.createEvent("HTMLEvents");
  event.initEvent("resize", true, false);
  window.dispatchEvent(event);
}
