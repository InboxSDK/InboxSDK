/* @flow */

export default function setupInboxFakeWindowResizeListener() {
  document.addEventListener('inboxSDKinboxFakeWindowResize', fakeWindowResize);
}

function fakeWindowResize() {
  (Object:any).defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    value: window.innerWidth-1
  });

  {
    const event = document.createEvent("HTMLEvents");
    (event:any).initEvent("resize", true, false);
    window.dispatchEvent(event);
  }

  (Object:any).defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    get: () => window.innerWidth
  });

  {
    const event = document.createEvent("HTMLEvents");
    (event:any).initEvent("resize", true, false);
    window.dispatchEvent(event);
  }
}
