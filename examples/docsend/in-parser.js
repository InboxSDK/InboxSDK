function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
};

function storeUserData(id, name, company) {
  if(id.length < 0 || name.length < 0) {
    return;
  }

  var data = {};
  if (company.length > 0) {
    data[id] = name + ' at ' + company;
  } else {
    data[id] = name;
  }

  chrome.storage.local.set(data, function() {
    if(chrome.runtime.lastError && chrome.runtime.lastError.message) {
      // Purge!

      var linkDefaults;
      chrome.storage.local.get('linkDefaults', function(item) {
        linkDefaults = item;
      });

      var linkDefaultsUserId;
      chrome.storage.local.get('linkDefaultsUserId', function(item) {
        linkDefaultsUserId = item;
      });

      chrome.storage.local.clear();
      
      if(linkDefaults) {
        chrome.storage.local.set(linkDefaults);
      }

      if(linkDefaultsUserId) {
        chrome.storage.local.set(linkDefaultsUserId);
      }

      chrome.storage.local.set(data);
    }
  });
};

var salesReg = new RegExp("\/sales\/profile\/([a-zA-Z]*\\d*)");
function getId() {
  var id = getParameterByName('destID');

  if(id.length > 0) {
    return id;
  }

  id = getParameterByName('id');

  if(id.length > 0) {
    return id;
  }

  var results = salesReg.exec(location.href);
  if(results != null && results.length > 1) {
    return results[1];
  }

  return '';
};

function getName() {
  var result = $('#name').text();
  if(result.length == 0) {
    var memberNames = $('.member-name');
    if(memberNames.length > 0) {
      // Grab the first name we found >_>
      result = memberNames.first().text();
    }
  }

  return result;
};

function parseCompany(text) {
  var token = " at ";
  var company = "";
  var companyIndex = text.indexOf(token);
  if(companyIndex > -1) {
    company = text.substr(text.indexOf(token) + token.length);
  }

  return company;
};

function getCompany() {
  var headline = $('#headline').text();
  if(headline.length == 0) {
    headline = $('.title').first().text();
  }

  return parseCompany(headline);
};

window.addEventListener('load', function() {
  var reg = /(.*)linkedin\.com(.*)/;
  var results = reg.exec(window.location.host);
  if(results == null || results.length == 0) {
    return;
  }

  var id = getId();
  var name = getName();
  var company = getCompany();

  if(id.length > 0 && name.length > 0) {
    storeUserData(id, name, company);
  }

  var results = $('.result');
  if(results.length > 0) {
    results.each(function(index, elem) {
      var elem = $(elem);
      var name = elem.find('.title').text();
      var description = elem.find('.description');
      var company = parseCompany(description.text());

      if(name.length > 0) {
        var id = description.closest('.result').attr('data-li-entity-id');
        if(id.length > 0) {
          storeUserData(id, name, company);
        }
      }
    });
  }

  results = $('.entity');
  if(results.length > 0) {
    results.each(function(index, elem) {
      var elem = $(elem);
      var name = elem.find('.name').text();
      var description = elem.find('.headline').text();
      var company = parseCompany(description);

      if(name.length > 0) {
        var anchor = elem.find('a.img-wrapper').attr('href');
        var ids = salesReg.exec(anchor);
        if(ids != null) {
          storeUserData(ids[1], name, company);
        }
      }
    });
  }
});
