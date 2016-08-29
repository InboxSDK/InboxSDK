/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';

export default class GenericButtonView {
	_eventStream: Bus<any>;
	_element: HTMLElement;

	constructor(element: HTMLElement){
		this._eventStream = kefirBus();
		this._element = element;

		this._setupEventStream();
	}

	destroy(){
		this._element.remove();
		this._eventStream.end();
	}

	getElement(): HTMLElement {
		return this._element;
	}

	getEventStream(): Kefir.Observable<Object> {
		return this._eventStream;
	}

	activate(){/* do nothing */}

	deactivate(){/* do nothing */}

	_setupEventStream(){
		var clickEventStream = Kefir.fromEvents(this._element, 'click');

		clickEventStream.onValue(function(event){
			event.stopPropagation();
			event.preventDefault();
		});

		this._eventStream.plug(
			clickEventStream.map(function(event){
				return {
					eventName: 'click',
					domEvent: event
				};
			})
		);
	}

}
