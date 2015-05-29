document.addEventListener('DOMContentLoaded', function() {
  Ajaxer.get(DsApiBridge.INFO_URL, null, function(data) {
    if(data.readyState != 4) {
      // don't do anything until the response is ready
      return;
    }

    var response = JSON.parse(data.responseText);
    appendScript(response.bjs);
    appendStylesheet(response.bcss);
  });
});

var appendScript = function(url, onloadCallback) {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = url;
  script.onload = function() {
    if(typeof onloadCallback !== 'undefined') {
      onloadCallback();
    }
  };
  document.head.appendChild(script);
};

var appendStylesheet = function(url) {
  var sheet = document.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.type = 'text/css';
  sheet.href = url;
  document.head.appendChild(sheet);
};
