export default function xhrHelper() {
  document.addEventListener('inboxSDKresolveURL', function(event) {
    const url = event.detail && event.detail.url;
    const xhr = new XMLHttpRequest();
    xhr.open('HEAD', url);
    xhr.onload = function() {
      const event = document.createEvent('CustomEvent');
      event.initCustomEvent('inboxSDKresolveURLdone', false, false, {
        url,
        success: true,
        responseURL: xhr.responseURL
      });
      document.dispatchEvent(event);
    };
    xhr.onerror = function(err) {
      const event = document.createEvent('CustomEvent');
      event.initCustomEvent('inboxSDKresolveURLdone', false, false, {
        url,
        success: false
      });
      document.dispatchEvent(event);
    };
    xhr.send();
  });
}
