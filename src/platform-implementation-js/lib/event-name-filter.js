/* @flow */
//jshint ignore:start

type Event = {
	eventName: string;
};

export default function eventNameFilter(eventName: string): (event: Event) => boolean {
	return function(event: Event) {
		return event.eventName === eventName;
	};
}
