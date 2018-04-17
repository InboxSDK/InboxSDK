/* @flow */

import {defn} from 'ud';
import escape from 'lodash/escape';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import type {Bus} from 'kefir-bus';
import RSVP from 'rsvp';
import autoHtml from 'auto-html';

import querySelector from '../../../lib/dom/querySelectorOrFail';
import InboxDropdownButtonView from '../widgets/buttons/inbox-dropdown-button-view';
import GmailDropdownView from '../widgets/gmail-dropdown-view';
import DropdownButtonViewController from '../../../widgets/buttons/dropdown-button-view-controller';

import type GmailDriver from '../gmail-driver';


class GmailCollapsibleSectionView {
	_driver: GmailDriver;
	_groupOrderHint: number;
	_isReadyDeferred: Object;
	_isCollapsible: boolean;
	_collapsibleSectionDescriptor: Object = {};
	_isSearch: boolean;
	_element: ?HTMLElement = null;
	_headerElement: ?HTMLElement = null;
	_titleElement: ?HTMLElement = null;
	_bodyElement: ?HTMLElement = null;
	_contentElement: ?HTMLElement = null;
	_tableBodyElement: ?HTMLElement = null;
	_collapsedContainer: ?HTMLElement = null;
	_messageElement: ?HTMLElement = null;
	_footerElement: ?HTMLElement = null;
	_eventStream: Bus<any>;
	_isCollapsed: boolean = false;
	_inboxDropdownButtonView: ?Object = null;
	_dropdownViewController: ?Object = null;

	constructor(driver: GmailDriver, groupOrderHint: number, isSearch: boolean, isCollapsible: boolean){
		this._driver = driver;
		this._isSearch = isSearch;
		this._groupOrderHint = groupOrderHint;
		this._isCollapsible = isCollapsible;
		this._eventStream = kefirBus();

		this._isReadyDeferred = new RSVP.defer();
	}

	destroy(){
		if(this._element) this._element.remove();
		if(this._eventStream) this._eventStream.end();
		if(this._headerElement) this._headerElement.remove();
		if(this._titleElement) this._titleElement.remove();
		if(this._bodyElement) this._bodyElement.remove();
		if(this._contentElement) this._contentElement.remove();
		if(this._tableBodyElement) this._tableBodyElement.remove();
		if(this._collapsedContainer) this._collapsedContainer.remove();
		if(this._messageElement) this._messageElement.remove();
		if(this._inboxDropdownButtonView) this._inboxDropdownButtonView.destroy();
		if(this._dropdownViewController) this._dropdownViewController.destroy();
	}

	getElement(): HTMLElement {
		const element = this._element;
		if(!element) throw new Error('tried to access element that does not exist');
		return element;
	}

	getEventStream(): Kefir.Observable<any> {
		return this._eventStream;
	}

	setCollapsibleSectionDescriptorProperty(collapsibleSectionDescriptorProperty: Kefir.Observable<?Object>){
		const stoppedProperty = collapsibleSectionDescriptorProperty
								.takeUntilBy(this._eventStream.filter(() => false).beforeEnd(() => null));

		stoppedProperty.onValue(x => this._updateValues(x));
		stoppedProperty.take(1).onValue(x => this._isReadyDeferred.resolve(this));
	}

	setCollapsed(value: boolean){
		if(!this._isCollapsible){
			return;
		}

		this._isReadyDeferred.promise.then(() => {
			if(value) this._collapse();
			else this._expand();
		});
	}

	_updateValues(collapsibleSectionDescriptor: ?Object){
		const element = this._element;
		if(!collapsibleSectionDescriptor){
			if(element){
				element.style.display = 'none';
			}

			return;
		}
		else if(element){
			element.style.display = '';
		}

		if(!element){
			this._setupElement(collapsibleSectionDescriptor);
			this._showLoadingMessage();
		}
		else{
			this._updateElement(collapsibleSectionDescriptor);
		}

		this._updateHeader(collapsibleSectionDescriptor);
		this._updateTitle(collapsibleSectionDescriptor);
		this._updateSubtitle(collapsibleSectionDescriptor);
		this._updateSummaryText(collapsibleSectionDescriptor);
		this._updateDropdown(collapsibleSectionDescriptor);
		this._updateContentElement(collapsibleSectionDescriptor);
		this._updateTableRows(collapsibleSectionDescriptor);
		this._updateMessageElement(collapsibleSectionDescriptor);
		this._updateFooter(collapsibleSectionDescriptor);

		this._collapsibleSectionDescriptor = collapsibleSectionDescriptor;
	}

	_setupElement(collapsibleSectionDescriptor: Object){
		const element = this._element = document.createElement('div');
		element.setAttribute('class', 'inboxsdk__resultsSection');
		element.setAttribute('data-group-order-hint', String(this._groupOrderHint));
		element.setAttribute('data-order-hint', String(typeof collapsibleSectionDescriptor.orderHint === 'number' ? collapsibleSectionDescriptor.orderHint : 0));
		if (!this._isCollapsible) element.classList.add('inboxsdk__resultsSection_nonCollapsible');

		this._setupHeader(collapsibleSectionDescriptor);

		const bodyElement = this._bodyElement = document.createElement('div');
		const bodyContentsElement = document.createElement('div');
		bodyContentsElement.classList.add('zE');
		bodyElement.appendChild(bodyContentsElement);

		element.appendChild(bodyElement);

		const contentElement = this._contentElement = document.createElement('div');
		bodyContentsElement.appendChild(contentElement);

		const messageElement = this._messageElement = document.createElement('div');
		bodyContentsElement.appendChild(messageElement);

		const tableBodyElement = this._tableBodyElement = document.createElement('div');
		bodyContentsElement.appendChild(tableBodyElement);

		this._setupFooter(collapsibleSectionDescriptor);

		if(this._isCollapsible){
			const clickTarget = this._driver.isUsingMaterialUI() ? this._headerElement : this._titleElement;
			if (clickTarget) {
				Kefir.fromEvents(clickTarget, 'click').onValue(() => this._toggleCollapseState());
			}
		}

		Kefir.fromEvents(element, 'removeCollapsedContainer').onValue(() => this._destroyCollapsedContainer());
		Kefir.fromEvents(element, 'readdToCollapsedContainer').onValue(() => this._addToCollapsedContainer());

		this._eventStream.emit({
			type: 'update',
			property: 'orderHint',
			sectionDescriptor: collapsibleSectionDescriptor
		});
	}

	_setupHeader(collapsibleSectionDescriptor: Object){
		const headerElement = this._headerElement = document.createElement('div');
		headerElement.classList.add('inboxsdk__resultsSection_header');
		if (!this._isSearch) headerElement.classList.add('Wg');

		if (this._driver.isUsingMaterialUI()) {
			this._setupGmailv2Header(headerElement, collapsibleSectionDescriptor);
		}
		else {
			this._setupGmailv1Header(headerElement, collapsibleSectionDescriptor);
		}

		if(this._element) this._element.appendChild(headerElement);
	}

	_setupGmailv1Header(headerElement: HTMLElement, collapsibleSectionDescriptor: Object) {
		const titleElement = this._titleElement = document.createElement('div');
		titleElement.setAttribute('class', 'inboxsdk__resultsSection_title');

		titleElement.innerHTML = '<span class="Wp Wq"></span>'
			+ '<h3 class="' + (this._isSearch ? 'Wd' : 'Wr') + '">'
			+ escape(collapsibleSectionDescriptor.title)
			+ '</h3>';

		const floatRightElement = document.createElement('div');
		floatRightElement.classList.add('Cr');

		if(this._isSearch) floatRightElement.classList.add('Wg');
		else titleElement.classList.add('Wn');

		headerElement.appendChild(titleElement);
		headerElement.appendChild(floatRightElement);
	}

	_setupGmailv2Header(headerElement: HTMLElement, collapsibleSectionDescriptor: Object) {
		const titleElement = this._titleElement = document.createElement('div');
		titleElement.setAttribute('class', 'inboxsdk__resultsSection_title');

		titleElement.innerHTML = [
			'<h3 class="Wr iR">',
				'<img alt="" src="//ssl.gstatic.com/ui/v1/icons/mail/images/cleardot.gif" class="qi Wp Wq">',
				'<div class="Wn">',
					escape(collapsibleSectionDescriptor.title),
				'</div>',
			'</h3>'
		].join('');

		const floatRightElement = document.createElement('div');
		floatRightElement.classList.add('Cr');
		if(this._isSearch) floatRightElement.classList.add('Wg');

		headerElement.appendChild(titleElement);
		headerElement.appendChild(floatRightElement);
	}

	_setupFooter(collapsibleSectionDescriptor: Object){
		const footerElement = this._footerElement = document.createElement('div');
		footerElement.classList.add('inboxsdk__resultsSection_footer');

		if(this._bodyElement) this._bodyElement.appendChild(footerElement);
	}

	_updateElement(collapsibleSectionDescriptor: Object){
		if(this._collapsibleSectionDescriptor.orderHint !== collapsibleSectionDescriptor.orderHint){
			const element = this._element;
			if(element) element.setAttribute('data-order-hint', "" + (typeof collapsibleSectionDescriptor.orderHint === 'number' ? collapsibleSectionDescriptor.orderHint : 0));

			this._eventStream.emit({
				type: 'update',
				property: 'orderHint'
			});
		}
	}

	_updateHeader(collapsibleSectionDescriptor: Object){
		if(this._isCollapsible || collapsibleSectionDescriptor.title || collapsibleSectionDescriptor.subtitle || collapsibleSectionDescriptor.titleLinkText || collapsibleSectionDescriptor.hasDropdown){
			if(this._headerElement) this._headerElement.style.display = '';
		}
		else{
			if(this._headerElement) this._headerElement.style.display = 'none';
		}
	}

	_updateTitle(collapsibleSectionDescriptor: Object){
		if(this._collapsibleSectionDescriptor.title !== collapsibleSectionDescriptor.title){
			const selector = this._driver.isUsingMaterialUI() ? 'h3 > .Wn' : 'h3';

			if(this._titleElement) {
				querySelector(this._titleElement, selector).textContent = collapsibleSectionDescriptor.title;
			}
		}
	}

	_updateSubtitle(collapsibleSectionDescriptor: Object ){
		const titleElement = this._titleElement;
		if(!titleElement) return;

		let subtitleElement = titleElement.querySelector('.inboxsdk__resultsSection_title_subtitle');
		if(!collapsibleSectionDescriptor.subtitle){
			if(subtitleElement){
				subtitleElement.remove();
			}
		}
		else if(this._collapsibleSectionDescriptor.subtitle !== collapsibleSectionDescriptor.subtitle){
			if(!subtitleElement){
				subtitleElement = document.createElement('span');
				if(subtitleElement && titleElement){
					subtitleElement.classList.add('inboxsdk__resultsSection_title_subtitle');

					const insertionPoint = this._driver.isUsingMaterialUI() ? titleElement.querySelector('.Wn') : titleElement.querySelector('h3');

					if(insertionPoint) {
						if (this._driver.isUsingMaterialUI()) {
							subtitleElement.classList.add('aw5');
						}

						(insertionPoint: any).appendChild(subtitleElement);
					}
				}
			}

			subtitleElement.textContent = '(' + collapsibleSectionDescriptor.subtitle + ')';
		}
	}

	_updateSummaryText(collapsibleSectionDescriptor: Object){
		const headerElement = this._headerElement;
		if(!headerElement) return;

		let summaryTextElement = headerElement.querySelector('.inboxsdk__resultsSection_header_summaryText');
		if(!collapsibleSectionDescriptor.titleLinkText){
			if(summaryTextElement){
				summaryTextElement.remove();
			}
		}
		else if(collapsibleSectionDescriptor.titleLinkText !== this._collapsibleSectionDescriptor.titleLinkText){
			if(!summaryTextElement){
				summaryTextElement = document.createElement('div');
				summaryTextElement.setAttribute('class', 'inboxsdk__resultsSection_header_summaryText Wm');

				summaryTextElement.innerHTML = [
					'<span class="Di">&nbsp;',
						'<div class="J-J5-Ji amH">',
							'<span class="Dj">',
								(this._driver.isUsingMaterialUI() ? '<span></span>' : '<b></b>'),
							'</span>',
							'&nbsp;',
						'</div>',
					'</span>'
				].join('');

				this._eventStream.plug(
					Kefir.fromEvents(summaryTextElement, 'click').map(() => ({
						eventName: 'titleLinkClicked',
						sectionDescriptor: this._collapsibleSectionDescriptor
					}))
				);

				const _summaryTextElement = summaryTextElement;
				summaryTextElement.addEventListener('mouseenter', function(){
					_summaryTextElement.classList.add('aqi');
				});

				summaryTextElement.addEventListener('mouseleave', function(){
					_summaryTextElement.classList.remove('aqi');
				});

				const insertionPoint = headerElement.querySelector('.Cr');
				if(insertionPoint) (insertionPoint: any).insertAdjacentElement('afterbegin', summaryTextElement);
			}

			querySelector(summaryTextElement, '.Dj > *').textContent = collapsibleSectionDescriptor.titleLinkText;
		}
	}

	_updateDropdown(collapsibleSectionDescriptor: Object){
		if(!collapsibleSectionDescriptor.hasDropdown || !collapsibleSectionDescriptor.onDropdownClick){
			if(this._inboxDropdownButtonView) this._inboxDropdownButtonView.destroy();
			if(this._dropdownViewController) this._dropdownViewController.destroy();
		}
		else if(collapsibleSectionDescriptor.hasDropdown && collapsibleSectionDescriptor.onDropdownClick){

			if(!this._inboxDropdownButtonView || !this._dropdownViewController){
				const inboxDropdownButtonView = this._inboxDropdownButtonView = new InboxDropdownButtonView();
				this._dropdownViewController = new DropdownButtonViewController({
					buttonView: inboxDropdownButtonView,
					dropdownViewDriverClass: GmailDropdownView,
					dropdownShowFunction: collapsibleSectionDescriptor.onDropdownClick
				});

				const headerElement = this._headerElement;
				if(headerElement) {
					const childElement = headerElement.querySelector('.Cr');
					if(childElement) childElement.appendChild(inboxDropdownButtonView.getElement());
				}
			}
			else if(collapsibleSectionDescriptor.onDropdownClick !== this._collapsibleSectionDescriptor.onDropdownClick){
				if(this._dropdownViewController) this._dropdownViewController.setDropdownShowFunction(collapsibleSectionDescriptor.onDropdownClick);
			}
		}
	}

	_updateContentElement(collapsibleSectionDescriptor: Object){
		const contentElement = this._contentElement;
		if(!contentElement) return;

		contentElement.innerHTML = '';

		if(collapsibleSectionDescriptor.contentElement){
			contentElement.style.display = '';
			contentElement.appendChild(collapsibleSectionDescriptor.contentElement);
		}
		else{
			contentElement.style.display = 'none';
		}
	}

	_updateTableRows(collapsibleSectionDescriptor: Object){
		const {tableRows} = collapsibleSectionDescriptor;
		const tableBodyElement = this._tableBodyElement;
		if(!tableBodyElement) return;

		tableBodyElement.innerHTML = '';

		if(!tableRows || tableRows.length === 0){
			tableBodyElement.style.display = 'none';
		}
		else{
			tableBodyElement.style.display = '';
			this._renderTable(tableRows);
		}
	}

	_renderTable(tableRows: Array<Object>){
		const tableElement = document.createElement('table');
		tableElement.setAttribute('class', 'F cf zt');
		tableElement.innerHTML = _getTableHTML();

		if(this._tableBodyElement) this._tableBodyElement.appendChild(tableElement);

		const tbody = tableElement.querySelector('tbody');
		const eventStream = this._eventStream;

		tableRows.forEach((result) => {
			const rowElement = document.createElement('tr');
			rowElement.setAttribute('class', 'inboxsdk__resultsSection_tableRow zA ' + (result.isRead ? 'yO' : 'zE'));
			rowElement.innerHTML = _getRowHTML(result);

			if (!tbody) throw new Error('should not happen');
			tbody.appendChild(rowElement);

			eventStream.plug(
				Kefir
					.fromEvents(rowElement, 'click')
					.map(() => ({
						eventName: 'rowClicked',
						rowDescriptor: result
					}))
			);
		});
	}

	_updateMessageElement(collapsibleSectionDescriptor: Object){
		const messageElement = this._messageElement;
		if(collapsibleSectionDescriptor.tableRows && collapsibleSectionDescriptor.tableRows.length > 0 || collapsibleSectionDescriptor.contentElement){
			if(messageElement){
				messageElement.innerHTML = '';
				messageElement.style.display = 'none';
			}
		}
		else if((collapsibleSectionDescriptor.tableRows && collapsibleSectionDescriptor.tableRows.length === 0) && !collapsibleSectionDescriptor.contentElement){
			this._showEmptyMessage();
		}
	}

	_showLoadingMessage(){
		const messageElement = this._messageElement;
		if(messageElement){
			messageElement.setAttribute('class', 'TB TC inboxsdk__resultsSection_loading');
			messageElement.innerHTML = 'loading...'; //TODO: localize
			messageElement.style.display = '';
		}
	}

	_showEmptyMessage(){
		const messageElement = this._messageElement;
		if(messageElement){
			messageElement.setAttribute('class', 'TB TC');
			messageElement.innerHTML = 'No results found'; //TODO: localize
			messageElement.style.display = '';
		}
	}

	_updateFooter(collapsibleSectionDescriptor: Object){
		const footerElement = this._footerElement;
		if(!footerElement) return;

		footerElement.innerHTML = '';

		if(!collapsibleSectionDescriptor.footerLinkText && !collapsibleSectionDescriptor.footerLinkIconUrl && !collapsibleSectionDescriptor.footerLinkIconClass){
			footerElement.style.display = 'none';
		}
		else{
			footerElement.style.display = '';

			const footerLinkElement = document.createElement('span');
			footerLinkElement.setAttribute('class', 'e Wb');
			footerLinkElement.textContent = collapsibleSectionDescriptor.footerLinkText;

			this._eventStream.plug(
				Kefir.fromEvents(footerLinkElement, 'click')
					.map(() => {
						return {
							eventName: 'footerClicked',
							sectionDescriptor: this._collapsibleSectionDescriptor
						};
					})
			);

			footerElement.appendChild(footerLinkElement);
			footerElement.insertAdjacentHTML('beforeend', '<br style="clear:both;">');
		}
	}

	_toggleCollapseState(){
		if(this._isCollapsed){
			this._expand();
		}
		else{
			this._collapse();
		}
	}

	_collapse(){
		const element = this._element;
		if(!element){
			return;
		}

		element.classList.add('inboxsdk__resultsSection_collapsed');

		if(!this._isSearch){
			this._addToCollapsedContainer();
		}

		const selector = this._driver.isUsingMaterialUI() ? 'h3 > img.Wp' : '.Wp';
		if(this._titleElement){
			const arrowSpan = querySelector(this._titleElement, selector);
			if (arrowSpan) {
				arrowSpan.classList.remove('Wq');
				arrowSpan.classList.add('Wo');
			}
		}

		if(this._bodyElement) this._bodyElement.style.display = 'none';
		this._isCollapsed = true;

		this._eventStream.emit({
			eventName: 'collapsed'
		});
	}

	_expand(){
		const element = this._element;
		if(!element){
			return;
		}

		element.classList.remove('inboxsdk__resultsSection_collapsed');

		if(!this._isSearch){
			this._removeFromCollapsedContainer();
		}

		const selector = this._driver.isUsingMaterialUI() ? 'h3 > img.Wp' : '.Wp';
		if(this._titleElement){
			const arrowSpan = querySelector(this._titleElement, selector);
			if (arrowSpan) {
				arrowSpan.classList.remove('Wo');
				arrowSpan.classList.add('Wq');
			}
		}


		if(this._bodyElement) this._bodyElement.style.display = '';
		this._isCollapsed = false;

		this._eventStream.emit({
			eventName: 'expanded'
		});
	}

	_addToCollapsedContainer(){
		const element = this._element;
		if(!element) return;
		if(this._headerElement) this._headerElement.classList.remove('Wg');

		if(this._isCollapsedContainer(element.previousElementSibling) && this._isCollapsedContainer(element.nextElementSibling)){

			//we are surrounded by collapse containers, let's favor our previous sibling
			const otherCollapseContainer = element.nextElementSibling;
			const previousSibling = element.previousElementSibling;
			if(!previousSibling) throw new Error('previousSibling does not exist');
			if(!otherCollapseContainer) throw new Error('otherCollapseContainer does not exist');

			const anchor = previousSibling.children[0].appendChild(element);

			//now we need to "merge" the two collapse containers. This can be done by taking all the result sections out of the collapsed container
			//and calling our "recollapse" helper function on them
			const elementsToRecollapse = Array.from(otherCollapseContainer.children[0].children).concat(Array.from(otherCollapseContainer.children[1].children));

			if(otherCollapseContainer) this._pulloutSectionsFromCollapsedContainer((otherCollapseContainer: any));
			this._recollapse(elementsToRecollapse);
		}
		else {
			this._readdToCollapsedContainer();
		}
	}

	_removeFromCollapsedContainer(){
		if(this._headerElement) this._headerElement.classList.add('Wg');
		const element = this._element;
		if(!element) return;

		const parentElement = element.parentElement;
		if(!parentElement) return;

		const container = parentElement.parentElement;

		if(!container || !container.classList.contains('inboxsdk__results_collapsedContainer')){
			return;
		}

		const elementsToRecollapse = Array.from(container.children[0].children).concat(Array.from(container.children[1].children));
		this._pulloutSectionsFromCollapsedContainer((container: any));
		this._destroyCollapsedContainer();

		this._recollapse(elementsToRecollapse.filter((child) => child !== element));
	}

	_pulloutSectionsFromCollapsedContainer(container: HTMLElement){
		const prependedChildren = Array.from(container.children[0].children);
		prependedChildren.forEach((child) => (container: any).insertAdjacentElement('beforebegin', child));

		const appendedChildren = Array.from(container.children[1].children).reverse();
		appendedChildren.forEach((child) => (container: any).insertAdjacentElement('afterend', child));
	}

	_readdToCollapsedContainer(){
		const element = this._element;
		if(!element) return;

		if(this._collapsedContainer){
			this._collapsedContainer.children[0].insertBefore(element, this._collapsedContainer.children[1].firstElementChild);
			return;
		}

		let collapsedContainer;
		let isPrepend;

		if(this._isCollapsedContainer(element.previousElementSibling)){
			isPrepend = false;
			collapsedContainer = element.previousElementSibling;
		}
		else if(this._isCollapsedContainer(element.nextElementSibling)){
			isPrepend = true;
			collapsedContainer = element.nextElementSibling;
		}
		else {
			isPrepend = true;
			this._createCollapsedContainer();
			collapsedContainer = this._collapsedContainer;
		}

		if(isPrepend && collapsedContainer){
			collapsedContainer.children[0].insertBefore(element, collapsedContainer.children[0].firstElementChild);
		}
		else if(collapsedContainer){
			collapsedContainer.children[0].appendChild(element);
		}
	}

	_isCollapsedContainer(element: any){
		return element && element.classList.contains('inboxsdk__results_collapsedContainer');
	}

	_recollapse(children: Array<Object> ){
		children.forEach((child) => {
			const removeEvent = document.createEvent("CustomEvent");
			(removeEvent: any).initCustomEvent('removeCollapsedContainer', false, false, null);
			child.dispatchEvent(removeEvent);

			const readdEvent = document.createEvent("CustomEvent");
			(readdEvent: any).initCustomEvent('readdToCollapsedContainer', false, false, null);
			child.dispatchEvent(readdEvent);
		});
	}

	_createCollapsedContainer(){
		const collapsedContainer = this._collapsedContainer = document.createElement('div');
		collapsedContainer.setAttribute('class', 'inboxsdk__results_collapsedContainer Wg');
		collapsedContainer.innerHTML = '<div class="inboxsdk__results_collapsedContainer_prepend"></div><div class="inboxsdk__results_collapsedContainer_append"></div>';

		const element = this._element;
		if(element) (element: any).insertAdjacentElement('afterend', collapsedContainer);
	}

	_destroyCollapsedContainer(){
		if(this._collapsedContainer){
			this._collapsedContainer.remove();
			this._collapsedContainer = null;
		}
	}
}


function _getTableHTML(){
	return [
		'<colgroup>',
			'<col class="k0vOLb">',
			'<col class="Ci">',
			'<col class="y5">',
			'<col class="WA">',
			'<col class="yY">',
			'<col>',
			'<col class="xX">',
		'</colgroup>',
		'<tbody>',
		'</tbody>'
	].join('');
}

function _getRowHTML(result){
	let iconHtml = '';
	if(result.iconUrl) iconHtml = autoHtml `<img class="inboxsdk__resultsSection_result_icon" src="${result.iconUrl}">`;
	else if(result.iconClass) iconHtml = autoHtml `<div class="${result.iconClass}"></div>`;

	const labelsHtml = Array.isArray(result.labels) ? result.labels.map(_getLabelHTML).join('') : '';

	const rowArr = [
		'<td class="xY PF"></td>',
		'<td class="xY oZ-x3"></td>',
		'<td class="xY WA">',
			iconHtml,
		'</td>',
		'<td class="xY WA"></td>',
		'<td class="xY yX inboxsdk__resultsSection_result_title">',
			'<div class="yW">',
				'<span ' + (result.isRead ? '' : 'class="zF"') + '>',
					escape(result.title),
				'</span>',
			'</div>',
		'</td>',
		'<td class="xY a4W">',
			'<div class="xS">',
				'<div class="xT">',
					'<div class="yi">',
						labelsHtml,
					'</div>',
					'<div class="y6">',
						'<span class="bog">',
							(result.isRead ? '' : '<b>'),
								escape(result.body || ''),
							(result.isRead ? '' : '</b>'),
						'</span>',
					'</div>',
				'</div>',
			'</div>',
		'</td>',
		'<td class="xY xW">',
			'<span' + (result.isRead ? '' : ' class="bq3"') + '>',
				escape(result.shortDetailText || ''),
			'</span>',
		'</td>'
	];

	return rowArr.join('');
}

function _getLabelHTML(label){
	const backgroundColor = label.backgroundColor || 'rgb(194, 194, 194)'; //grey
	const foregroundColor = label.foregroundColor || 'rgb(255, 255, 255)'; //white

	const retArray = [
		autoHtml `<div class="ar as" data-tooltip="${label.title}">
			<div class="at" style="background-color: ${backgroundColor}; border-color: ${backgroundColor};">
				<div class="au" style="border-color: ${backgroundColor};">`
	];

	const styleHtml = label.iconBackgroundColor ?
		autoHtml `style="background-color: ${label.iconBackgroundColor}"` : '';

	if(label.iconClass){
		retArray.push(
			autoHtml `<div
				class="inboxsdk__resultsSection_label_icon ${label.iconClass || ''}"
				${{__html: styleHtml}}
				>
			</div>`
		);
	}
	else if(label.iconUrl){
		retArray.push(
			autoHtml `<img
				class="inboxsdk__resultsSection_label_icon"
				${{__html: styleHtml}}
				src="${label.iconUrl}" />`
		);
	}


	retArray.push(
		autoHtml `
					<div class="av" style="color: ${foregroundColor}">
						${label.title}
					</div>
				</div>
			</div>
		</div>
		`
	);

	return retArray.join('');
}

export default defn(module, GmailCollapsibleSectionView);
