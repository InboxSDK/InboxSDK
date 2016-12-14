/* @flow */

import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import idMap from '../../../../lib/idMap';
import querySelector from '../../../../lib/dom/querySelectorOrFail';

const TAB_COLOR_CLASSES = [
  "aIf-aLe",
  "aKe-aLe",
  "aJi-aLe",
  "aH2-aLe",
  "aHE-aLe"
];

export default class GmailTabView {
	_descriptor: Kefir.Observable<Object>;
	_groupOrderHint: any;
	_lastDescriptorValue: ?Object;
	_eventStream: Bus<any>;
	_element: HTMLElement;
	_innerElement: HTMLElement;
	_titleElement: HTMLElement;
	_iconElement: HTMLElement;
	_iconClass: ?string;
	_iconUrl: ?string;
	_iconImgElement: ?HTMLImageElement;
	_isActive: boolean;

	constructor(descriptorStream: Kefir.Observable<Object>, groupOrderHint: any) {
	  this._descriptor = descriptorStream;
	  this._groupOrderHint = groupOrderHint;
		this._lastDescriptorValue = null;
		this._isActive = false;

	  this._eventStream = kefirBus();

	  this._setupElement();
	  descriptorStream
			.takeUntilBy(this._eventStream.filter(()=>false).beforeEnd(()=>null))
			.onValue(x => {this._updateValues(x);});
	}

	destroy() {
		this._lastDescriptorValue = null;
		this._eventStream.end();
		(this._element:any).remove();
	}

	getDescriptor() {return this._descriptor;}
	getGroupOrderHint(): any {return this._groupOrderHint;}
	getElement(): HTMLElement {return this._element;}
	getEventStream(): Kefir.Observable<Object> {return this._eventStream;}

  setInactive() {
    this._element.classList.remove('inboxsdk__tab_selected');
    this._innerElement.classList.remove('J-KU-KO');
    this._isActive = false;
  }

  setActive() {
    this._element.classList.add('inboxsdk__tab_selected');
    this._innerElement.classList.add('J-KU-KO');
    this._isActive = true;
  }

  _setupElement() {
    this._element = document.createElement('td');
    this._element.setAttribute('class', 'aRz J-KU inboxsdk__tab');

    this._element.innerHTML = [
      '<div class="aAy" tabindex="0" role="tab">',
      '<div class="aKo"></div>',
      '<div class="aKu aKo aKr" ></div>',
      '<div class="aKp inboxsdk__tab_icon" ></div>',
      '<div class="aKw" >',
      '<div class="aKy" >',
      '<div class="aKx" >',
      '<div class="aKz inboxsdk__tab_title">',
      '</div>',
      '</div>',
      '</div>',
      '</div>',
      '</div>'
    ].join('');

    this._innerElement = querySelector(this._element, '[role=tab]');
    this._titleElement = querySelector(this._element, '.inboxsdk__tab_title');
    this._iconElement = querySelector(this._element, '.inboxsdk__tab_icon');

    this._element.setAttribute('data-group-order-hint', this._groupOrderHint);

    this._bindToDOMEvents();
  }

  _updateValues(descriptor: Object) {
    this._updateTitle(descriptor.title);
    this._updateOrderHint(descriptor.orderHint);
    this._updateIconClass(descriptor.iconClass);
    this._updateIconUrl(descriptor.iconUrl);

    if (descriptor.hideTitleBar) {
      this._element.classList.add(idMap('hideTitleBar'));
    } else {
      this._element.classList.remove(idMap('hideTitleBar'));
    }

    this._lastDescriptorValue = descriptor;
  }

  _updateTitle(newTitle: string) {
    if (this._lastDescriptorValue && this._lastDescriptorValue.title === newTitle) {
      return;
    }

    this._titleElement.textContent = newTitle;
  }

  _updateOrderHint(orderHint: any) {
    if (this._lastDescriptorValue && this._lastDescriptorValue.orderHint === orderHint) {
      return;
    }

    this._element.setAttribute('data-order-hint', orderHint);
  }

  _updateIconClass(newIconClass: ?string) {
    if (this._iconClass == newIconClass) {
      return;
    }

    var classList = 'aKp inboxsdk__tab_icon ' + (newIconClass || '');
    this._iconElement.setAttribute('class', classList);

    this._iconClass = newIconClass;
  }

  _updateIconUrl(newIconUrl: ?string) {
    if (this._iconUrl == newIconUrl) {
      return;
    }

    if (!newIconUrl) {
      if (this._iconImgElement) {
        (this._iconImgElement:any).remove();
        this._iconImgElement = null;
      }
    } else {
			var iconImgElement = this._iconImgElement;
      if (!iconImgElement) {
        iconImgElement = this._iconImgElement = document.createElement('img');
        this._iconElement.appendChild(iconImgElement);
      }

      iconImgElement.src = newIconUrl;
    }

    this._iconUrl = newIconUrl;
  }

  _bindToDOMEvents() {
    Kefir.fromEvents(this._element, 'mouseenter')
      .onValue(() => {
        this._innerElement.classList.add('J-KU-Je');
        this._innerElement.classList.add('J-KU-JW');
      });

    Kefir.fromEvents(this._element, 'mouseleave')
      .onValue(() => {
        this._innerElement.classList.remove('J-KU-Je');
        this._innerElement.classList.remove('J-KU-JW');
      });

    Kefir.fromEvents(this._element, 'newColorIndex')
      .map(x => x.detail)
      .onValue(detail => {this._setColorIndex(detail);});

    this._eventStream.plug(
      Kefir.fromEvents(this._element, 'click').map(_.constant({
        eventName: 'tabActivate',
        view: this
      }))
    );

    this._eventStream.plug(
      Kefir.fromEvents(this._element, 'tabActivate').map(_.constant({
        eventName: 'tabActivate',
        view: this
      }))
    );

    this._eventStream.plug(
      Kefir.fromEvents(this._element, 'tabDeactivate').map(_.constant({
        eventName: 'tabDeactivate',
        view: this
      }))
    );

  }

  _setColorIndex(colorIndex: number) {
    this._innerElement.setAttribute('class', 'aAy ' + TAB_COLOR_CLASSES[colorIndex % TAB_COLOR_CLASSES.length] + ' ' + (this._isActive ? 'J-KU-KO' : ''));
  }

}
