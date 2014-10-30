var _ = require('lodash');

var Email = function(){};

_.extend(Email.prototype, {

	getUser: function(){
		throw new Error("GmailSDK not loaded yet");
	}

});


module.exports = Email;
