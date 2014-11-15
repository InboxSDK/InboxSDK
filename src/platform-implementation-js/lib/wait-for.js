var RSVP = require('rsvp');

function waitFor(condition, timeout, steptime) {
	return new RSVP.Promise(function(resolve, reject) {
		if (!timeout) {
			timeout = 60*1000;
		}
		if (!steptime) {
			steptime = 250;
		}
		var waited = 0;
		// make this error here so we have a sensible stack.
		var timeoutError = new Error("waitFor timeout");
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
