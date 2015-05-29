(function () {
  var reg = /(.*)(mail|inbox)\.google\.com(.*)/;
  var results = reg.exec(window.location.host);
  if(results == null || results.length == 0) {
    return;
  }

  Ajaxer.get(DsApiBridge.INFO_URL, null, function(data) {
    if(data.readyState != 4) {
      // don't do anything until the response is ready
      return;
    }

    var response = JSON.parse(data.responseText);
    InboxSDK.loadScript(response.gjs);
    appendStylesheet(response.gcss);
  });

  Ajaxer.get(chrome.extension.getURL('content.html'), null, function(data) {
    if(data.readyState != 4) {
      // don't do anything until the response is ready
      return;
    }

    e = document.createElement('div');
    e.setAttribute('id', 'ds-popup-layout');
    e.style.cssText = 'display: none';
    e.innerHTML = data.responseText;
    document.body.appendChild(e);
  });
}());

var appendStylesheet = function(url) {
  var sheet = document.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.type = 'text/css';
  sheet.href = url;
  document.head.appendChild(sheet);
};
