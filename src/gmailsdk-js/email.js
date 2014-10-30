var Interface = require('./interface');

var Email = {
  getUserAsync: function() {
    return Interface.load().then(function(Imp) {
      return Imp.Email.getUserAsync();
    });
  }
};

module.exports = Email;
