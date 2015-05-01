import asap from 'asap';
import RSVP from 'rsvp';

export default function waitFor(condition, timeout, steptime) {
	// make this error here so we have a sensible stack.
	const timeoutError = new Error("waitFor timeout");

	return new RSVP.Promise(function(resolve, reject) {
		if (!timeout) {
			timeout = 60*1000;
		}
		if (!steptime) {
			steptime = 250;
		}
		let waited = 0;
		function step() {
			try {
				const result = condition();
				if (result) {
					resolve(result);
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
		asap(step);
	});
}
