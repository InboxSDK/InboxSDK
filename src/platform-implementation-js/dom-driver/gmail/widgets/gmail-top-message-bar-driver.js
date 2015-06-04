'use strict';

import Bacon from 'baconjs';
import addAccessors from 'add-accessors';

import fakeWindowResize from '../../../lib/fake-window-resize';


class GmailTopMessageBarDriver {

	constructor(optionStream){

		this._eventStream = new Bacon.Bus();

		optionStream
			.takeUntil(this._eventStream.filter(false).mapEnd())
			.onValue(option => {
				if(!option){
					if(this._element){
						this._element.remove();
						this._element = null;
					}
				}
				else if(option){
					if(!this._element){
						this._element = document.createElement('div');
						this._element.classList.add('inboxsdk__topMessageBar');

						document.body.insertBefore(this._element, document.body.firstChild);
	  					fakeWindowResize();
					}

					if(option.el !== this._element.children[0]){
						this._element.innerHTML = '';

						if(option.el){
							this._element.appendChild(option.el);
						}
					}
				}

			});
	}

	remove() {
		this.destroy();
	}
}

addAccessors(GmailTopMessageBarDriver.prototype, [
  {name: '_element', destroy: true, destroyMethod: 'remove'},
  {name: '_eventStream', get: true, destroy: true, destroyMethod: 'end'}
]);


export default GmailTopMessageBarDriver;
