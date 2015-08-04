/* @flow */
//jshint ignore:start

var Bacon = require('baconjs');
import fakeWindowResize from '../../../lib/fake-window-resize';

export default class GmailTopMessageBarDriver {
	_eventStream: Bacon.Bus;
	_element: ?HTMLElement;

	constructor(optionStream: Bacon.Observable<?Object>){
		this._eventStream = new Bacon.Bus();

		optionStream
			.takeUntil(this._eventStream.filter(()=>false).mapEnd(()=>null))
			.onValue(option => {
				if(!option){
					if(this._element){
						(this._element:any).remove();
						this._element = null;
					}
				} else if(option) {
					var element = this._element;
					if (!element) {
						element = this._element = document.createElement('div');
						element.classList.add('inboxsdk__topMessageBar');

						document.body.insertBefore(element, document.body.firstChild);
						fakeWindowResize();
					}

					if(option.el !== element.children[0]){
						element.innerHTML = '';

						if(option.el){
							element.appendChild(option.el);
						}
					}
				}

			});
	}

	destroy() {
		if (this._element) {
			(this._element:any).remove();
			this._element = null;
		}
		this._eventStream.end();
		fakeWindowResize();
	}

	getEventStream(): Bacon.Observable {return this._eventStream;}

	remove() {
		this.destroy();
	}
}
