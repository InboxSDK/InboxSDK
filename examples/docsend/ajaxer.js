(function(window) {
  var Ajaxer = {
    get: function(url, data, callback) {
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function () {
        if(xhr.readyState !== 3) {
          callback(xhr);
        }
      };

      xhr.open('GET', url, true);
      xhr.send();
    }
  };
  window.Ajaxer = Ajaxer;
})(window);
