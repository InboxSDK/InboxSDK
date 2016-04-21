/* @flow */

import {defn} from 'ud';
import _ from 'lodash';
import Kefir from 'kefir';
import kefirBus from 'kefir-bus';
import RSVP from 'rsvp';
import autoHtml from 'auto-html';

import InboxDropdownButtonView from '../widgets/buttons/inbox-dropdown-button-view';
import GmailDropdownView from '../widgets/gmail-dropdown-view';
import DropdownButtonViewController from '../../../widgets/buttons/dropdown-button-view-controller';


class GmailCollapsibleSectionView {
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
	_eventStream: Kefir.Bus;
	_isCollapsed: boolean = false;
	_inboxDropdownButtonView: ?Object = null;
	_dropdownViewController: ?Object = null;

	constructor(groupOrderHint: number, isSearch: boolean, isCollapsible: boolean){
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

	getEventStream(): Kefir.Bus {
		return this._eventStream;
	}

	setCollapsibleSectionDescriptorProperty(collapsibleSectionDescriptorProperty: Kefir.Stream){
		var stoppedProperty = collapsibleSectionDescriptorProperty
								.takeUntilBy(this._eventStream.filter(() => false).beforeEnd(() => null));

		stoppedProperty.onValue(x => this._updateValues(x));
		stoppedProperty.take(1).onValue(x => this._isReadyDeferred.resolve(this));
	}

	setCollapsed(value: boolean){
		if(!this._isCollapsible){
			return;
		}

		this._isReadyDeferred.promise.then(function(self){
			if(value){
				self._collapse();
			}
			else{
				self._expand();
			}
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
		element.setAttribute('data-group-order-hint', this._groupOrderHint);
		element.setAttribute('data-order-hint', _.isNumber(collapsibleSectionDescriptor.orderHint) ? collapsibleSectionDescriptor.orderHint : 0);

		this._setupHeader(collapsibleSectionDescriptor);

		const bodyElement = this._bodyElement = document.createElement('div');
		var bodyContentsElement = document.createElement('div');
		bodyContentsElement.classList.add('zE');
		bodyElement.appendChild(bodyContentsElement);

		element.appendChild(this._bodyElement);

		const contentElement = this._contentElement = document.createElement('div');
		bodyContentsElement.appendChild(contentElement);

		const messageElement = this._messageElement = document.createElement('div');
		bodyContentsElement.appendChild(messageElement);

		const tableBodyElement = this._tableBodyElement = document.createElement('div');
		bodyContentsElement.appendChild(tableBodyElement);

		this._setupFooter(collapsibleSectionDescriptor);

		if(this._isCollapsible && this._titleElement){
			Kefir.fromEvents(this._titleElement, 'click').onValue(() => this._toggleCollapseState());
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

		const titleElement = this._titleElement = document.createElement('div');
		titleElement.setAttribute('class', 'inboxsdk__resultsSection_title');

		var titleInnerHTML = '';

		if(this._isCollapsible){
			 titleInnerHTML += '<span class="Wp Wq"></span>';
		}


		if(this._isSearch){
			titleInnerHTML += '<h3 class="Wd">' + _.escape(collapsibleSectionDescriptor.title) + '</h3>';
		}
		else{
			headerElement.classList.add('Wg');
			titleInnerHTML += '<h3 class="Wr">' + _.escape(collapsibleSectionDescriptor.title) + '</h3>';
		}

		titleElement.innerHTML = titleInnerHTML;

		var floatRightElement = document.createElement('div');
		floatRightElement.classList.add('Cr');

		if(this._isSearch){
			floatRightElement.classList.add('Wg');
		}
		else{
			titleElement.classList.add('Wn');
		}

		headerElement.appendChild(titleElement);
		headerElement.appendChild(floatRightElement);
		if(this._element) this._element.appendChild(headerElement);
	}

	_setupFooter(collapsibleSectionDescriptor: Object){
		const footerElement = this._footerElement = document.createElement('div');
		footerElement.classList.add('inboxsdk__resultsSection_footer');

		if(this._bodyElement) this._bodyElement.appendChild(footerElement);
	}

	_updateElement(collapsibleSectionDescriptor: Object){
		if(this._collapsibleSectionDescriptor.orderHint !== collapsibleSectionDescriptor.orderHint){
			const element = this._element;
			if(element) element.setAttribute('data-order-hint', "" + (_.isNumber(collapsibleSectionDescriptor.orderHint) ? collapsibleSectionDescriptor.orderHint : 0));

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
			if(this._titleElement) this._titleElement.querySelector('h3').textContent = collapsibleSectionDescriptor.title;
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
					const h3 = titleElement.querySelector('h3');
					if(h3) (h3: any).insertAdjacentElement('afterend', subtitleElement);
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
							'<span class="Dj"><b>',
							'</b></span>',
						'</div>',
					'</span>'
				].join('');

				var self = this;
				this._eventStream.plug(
					Kefir.fromEvents(summaryTextElement, 'click').map(function(){
						return {
							eventName: 'titleLinkClicked',
							sectionDescriptor: self._collapsibleSectionDescriptor
						};
					})
				);

				summaryTextElement.addEventListener('mouseenter', function(){
					summaryTextElement.classList.add('aqi');
				});

				summaryTextElement.addEventListener('mouseleave', function(){
					summaryTextElement.classList.remove('aqi');
				});

				const insertionPoint = headerElement.querySelector('.Cr');
				if(insertionPoint) (insertionPoint: any).insertAdjacentElement('afterbegin', summaryTextElement);
			}

			summaryTextElement.querySelector('b').textContent = collapsibleSectionDescriptor.titleLinkText;
		}
	}

	_updateDropdown(collapsibleSectionDescriptor: Object){
		if(!collapsibleSectionDescriptor.hasDropdown || !collapsibleSectionDescriptor.onDropdownClick){
			if(this._inboxDropdownButtonView) this._inboxDropdownButtonView.destroy();
			if(this._dropdownViewController) this._dropdownViewController.destroy();
		}
		else if(collapsibleSectionDescriptor.hasDropdown && collapsibleSectionDescriptor.onDropdownClick){

			if(!this._inboxDropdownButtonView || !this._dropdownViewController){
				this._inboxDropdownButtonView = new InboxDropdownButtonView();
				this._dropdownViewController = new DropdownButtonViewController({
					buttonView: this._inboxDropdownButtonView,
					dropdownViewDriverClass: GmailDropdownView,
					dropdownShowFunction: collapsibleSectionDescriptor.onDropdownClick
				});

				const headerElement = this._headerElement;
				if(headerElement) headerElement.querySelector('.Cr').appendChild(this._inboxDropdownButtonView.getElement());
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
		var tableRows = collapsibleSectionDescriptor.tableRows;
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
		var tableElement = document.createElement('table');
		tableElement.setAttribute('class', 'F cf zt');
		tableElement.innerHTML = _getTableHTML();

		if(this._tableBodyElement) this._tableBodyElement.appendChild(tableElement);

		var tbody = tableElement.querySelector('tbody');
		var eventStream = this._eventStream;

		tableRows.forEach(function(result){
			var rowElement = document.createElement('tr');

			if(result.isRead){
				rowElement.setAttribute('class', 'zA yO');
			}
			else{
				rowElement.setAttribute('class', 'zA zE');
			}

			rowElement.innerHTML = _getRowHTML(result);

			tbody.appendChild(rowElement);

			eventStream.plug(
				Kefir
					.fromEvents(rowElement, 'click')
					.map(() => { return {
						eventName: 'rowClicked',
						rowDescriptor: result
					}})
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

			var footerLinkElement = document.createElement('span');
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

		if(this._titleElement){
			var arrowSpan = this._titleElement.children[0];
			arrowSpan.classList.remove('Wq');
			arrowSpan.classList.add('Wo');
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

		if(this._titleElement){
			var arrowSpan = this._titleElement.children[0];
			arrowSpan.classList.remove('Wo');
			arrowSpan.classList.add('Wq');
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
			var otherCollapseContainer = element.nextElementSibling;
			element.previousElementSibling.children[1].appendChild(element);

			//now we need to "merge" the two collapse containers. This can be done by taking all the result sections out of the collapsed container
			//and calling our "recollapse" helper function on them
			var elementsToRecollapse = _.toArray(otherCollapseContainer.children[0].children).concat(_.toArray(otherCollapseContainer.children[1].children));

			if(otherCollapseContainer) this._pulloutSectionsFromCollapsedContainer((otherCollapseContainer: any));
			this._recollapse(elementsToRecollapse);
		}
		else {
			this._readdToCollapsedContainer();
		}
	}

	_removeFromCollapsedContainer(){
		if(this._headerElement) this._headerElement.classList.add('Wg');
		var element = this._element;
		if(!element) return;

		const parentElement = element.parentElement;
		if(!parentElement) return;

		const container = parentElement.parentElement;

		if(!container || !container.classList.contains('inboxsdk__results_collapsedContainer')){
			return;
		}

		var elementsToRecollapse = _.toArray(container.children[0].children).concat(_.toArray(container.children[1].children));
		this._pulloutSectionsFromCollapsedContainer((container: any));
		this._destroyCollapsedContainer();

		this._recollapse(elementsToRecollapse.filter(function(child){
			return child !== element;
		}));
	}

	_pulloutSectionsFromCollapsedContainer(container: HTMLElement){
		var prependedChildren = _.toArray(container.children[0].children);
		_.each(prependedChildren, function(child){
			(container: any).insertAdjacentElement('beforebegin', child);
		});

		var appendedChildren = _.toArray(container.children[1].children).reverse();
		_.each(appendedChildren, function(child){
			(container: any).insertAdjacentElement('afterend', child);
		});
	}

	_readdToCollapsedContainer(){
		const element = this._element;
		if(!element) return;

		if(this._collapsedContainer){
			this._collapsedContainer.children[0].insertBefore(element, this._collapsedContainer.children[1].firstElementChild);
			return;
		}

		var collapsedContainer;
		var isPrepend;

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
			collapsedContainer.children[1].appendChild(element);
		}
	}

	_isCollapsedContainer(element: any){
		return element && element.classList.contains('inboxsdk__results_collapsedContainer');
	}

	_recollapse(children: Array<Object> ){
		_.each(children, function(child){
			var event = document.createEvent("CustomEvent");
			(event: any).initCustomEvent('removeCollapsedContainer', false, false, null);
			child.dispatchEvent(event);

			event = document.createEvent("CustomEvent");
			(event: any).initCustomEvent('readdToCollapsedContainer', false, false, null);
			child.dispatchEvent(event);
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
			'<col class="Ci">',
			'<col class="y5">',
			'<col class="yY">',
			'<col class="yF">',
			'<col>',
			'<col class="yg">',
			'<col class="xX">',
		'</colgroup>',
		'<tbody>',
		'</tbody>'
	].join('');
}

function _getRowHTML(result){
	var rowArr = ['<td class="xY dk5WUd">'];
	if(result.iconUrl){
		rowArr.push('<img class="inboxsdk__resultsSection_result_icon" src="' + result.iconUrl + '">');
	}
	else if(result.iconClass){
		rowArr.push('<div class="' + result.iconClass + '"></div>');
	}
	rowArr.push('</td>');

	rowArr.push('<td class="xY"></td>');

	rowArr = rowArr.concat([
		'<td class="xY yX inboxsdk__resultsSection_result_title">',
			'<div>',
				'<span ' + (result.isRead ? '' : 'class="zF"') + '>',
					_.escape(result.title),
				'</span>',
			'</div>',
		'</td>'
	]);

	rowArr.push('<td class="xY"></td>');


	rowArr = rowArr.concat([
		'<td class="xY">',
			'<div class="V3">',
				'<span class="ya35Wb">'
	]);

	if(_.isArray(result.labels)){
		result.labels.forEach(function(label){
			rowArr = rowArr.concat(_getLabelHTML(label));
		});
	}

	rowArr = rowArr.concat([
					(result.isRead ? '' : '<b>'),
						_.escape(result.body || ''),
					(result.isRead ? '' : '</b>'),
				'</span>',
			'</div>',
		'</td>'
	]);

	rowArr.push('<td class="xY"></td>');
	rowArr.push('<td class="xY xW"><span class="sehUKb">' + _.escape(result.shortDetailText || '') + '</span></td>');

	return rowArr.join('');
}

function _getLabelHTML(label){
	var backgroundColor = label.backgroundColor || 'rgb(194, 194, 194)'; //grey
	var foregroundColor = label.foregroundColor || 'rgb(255, 255, 255)'; //white

	var retArray = [
		autoHtml `<div class="ar as" data-tooltip="${label.title}">
			<div class="at" style="background-color: ${backgroundColor}; border-color: ${backgroundColor};">`
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
		`
	);

	return retArray.join('');
}
GmailCollapsibleSectionView = defn(module, GmailCollapsibleSectionView);

export default GmailCollapsibleSectionView;
