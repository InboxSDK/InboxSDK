/* @flow */

import RSVP from 'rsvp';

export default function waitFor<T>(condition: () => ?T, timeout: number=120*1000, steptime: number=250): Promise<T> {
	// make this error here so we have a sensible stack.
	var timeoutError = new Error("waitFor timeout");

	return new RSVP.Promise(function(resolve, reject) {
		var waited = 0;
		function step() {
			try {
				var result = condition();
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
		setTimeout(step, 1);
	});
}
