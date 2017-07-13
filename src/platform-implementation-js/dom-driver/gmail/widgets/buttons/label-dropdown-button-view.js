/* @flow */

import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import kefirStopper from 'kefir-stopper';

export default class LabelDropdownButtonView {
	_element: HTMLElement;
	_eventStream: Kefir.Observable<Object>;
	_stopper = kefirStopper();

	constructor(options: Object){
		this._setupElement(options.buttonBackgroundColor, options.buttonForegroundColor);
		this._setupEventStream();
	}

	destroy(){
		this._stopper.destroy();
		this._element.remove();
	}

	getElement(): HTMLElement {
		return this._element;
	}

	getEventStream(): Kefir.Observable<Object> {
		return this._eventStream;
	}

	activate(){/* do nothing */}

	deactivate(){/* do nothing */}

	_setupElement(backgroundColor: string, foregroundColor: string){
		this._element = document.createElement('div');
		this._element.setAttribute('class', 'nL aig');

		var isDefault = !backgroundColor && !foregroundColor;

		if(!backgroundColor){
			backgroundColor = 'rgb(194, 194, 194)';
		}

		if(!foregroundColor){
			foregroundColor = 'rgb(255, 255, 255)';
		}

		this._element.innerHTML = [
			'<div class="pM ' + (isDefault ? 'aj0': '') + '" style="color: ' + foregroundColor + '; background-color: ' + backgroundColor + '; border-color: ' + backgroundColor + '" role="button">',
				'<div class="p6 style="background-color: ' + backgroundColor + '">',
					'<div class="p8">▼</div>',
				'</div>',
			'</div>'
		].join('');
	}

	_setupEventStream(){
		var clickEventStream = Kefir.fromEvents(this._element, 'click');

		clickEventStream.onValue(function(event){
			event.stopPropagation();
			event.preventDefault();
		});

		this._eventStream =
			clickEventStream.map(function(event){
				return {
					eventName: 'click',
					domEvent: event
				};
			})
			.takeUntilBy(this._stopper);
	}
}
