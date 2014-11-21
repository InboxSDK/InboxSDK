var RSVP = require('rsvp');

function waitFor(condition, timeout, steptime) {
	// make this error here so we have a sensible stack.
	var timeoutError = new Error("waitFor timeout");

	return new RSVP.Promise(function(resolve, reject) {
		if (!timeout) {
			timeout = 60*1000;
		}
		if (!steptime) {
			steptime = 250;
		}
		var waited = 0;
		function step() {
			try {
				if (condition()) {
					resolve();
				} else {
					if (waited >= timeout) {
						reject(timeoutError);
					} else {
						waited += steptime;
						setTimeout(step, steptime);
					}
				}
			} catch(e) {
				reject(e);
			}
		}
		setTimeout(step, 1);
	});
}

module.exports = waitFor;
