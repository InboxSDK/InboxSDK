'use strict';

var _ = require('lodash');
var Bacon = require('baconjs');
var RSVP = require('rsvp');

var BasicClass = require('../../../lib/basic-class');


var InboxDropdownButtonView = require('../widgets/buttons/inbox-dropdown-button-view');
var GmailDropdownView = require('../widgets/gmail-dropdown-view');
var DropdownButtonViewController = require('../../../widgets/buttons/dropdown-button-view-controller');


var GmailCollapsibleSectionView = function(groupOrderHint, isSearch, isCollapsible){
	BasicClass.call(this);

	this._isSearch = isSearch;
	this._groupOrderHint = groupOrderHint;
	this._eventStream = new Bacon.Bus();
	this._collapsedContainer = null;
	this._isCollapsible = isCollapsible;

	this._isReadyDeferred = new RSVP.defer();
};

GmailCollapsibleSectionView.prototype = Object.create(BasicClass.prototype);

_.extend(GmailCollapsibleSectionView.prototype, {

	__memberVariables: [
		{name: '_groupOrderHint', destroy: false},
		{name: '_isCollapsible', destroy: false},
		{name: '_collapsibleSectionDescriptor', destroy: false, defaultValue: {}},
		{name: '_element', destroy: true, get: true},
		{name: '_isSearch', destroy: false},
		{name: '_headerElement', destroy: true},
		{name: '_titleElement', destroy: true},
		{name: '_bodyElement', destroy: true},
		{name: '_contentElement', destroy: true},
		{name: '_tableBodyElement', destroy: true},
		{name: '_collapsedContainer', destroy: true},
		{name: '_messageElement', destroy: true},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_isCollapsed', destroy: false, defaultValue: false},
		{name: '_inboxDropdownButtonView', destroy: true},
		{name: '_dropdownViewController', destroy: true},
		{name: '_footerElement', destroy: false}
	],

	setCollapsibleSectionDescriptorProperty: function(collapsibleSectionDescriptorProperty){
		var stoppedProperty = collapsibleSectionDescriptorProperty
								.takeUntil(this._eventStream.filter(false).mapEnd(null));

		stoppedProperty.onValue(this, '_updateValues');
		stoppedProperty.take(1).onValue(this._isReadyDeferred, 'resolve', this);
	},

	setCollapsed: function(value){
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
	},

	_updateValues: function(collapsibleSectionDescriptor){
		if(!collapsibleSectionDescriptor){
			if(this._element){
				this._element.style.display = 'none';
			}

			return;
		}
		else if(this._element){
			this._element.style.display = '';
		}

		if(!this._element){
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
	},

	_setupElement: function(collapsibleSectionDescriptor){
		this._element = document.createElement('div');
		this._element.setAttribute('class', 'inboxsdk__resultsSection');
		this._element.setAttribute('data-group-order-hint', this._groupOrderHint);
		this._element.setAttribute('data-order-hint', _.isNumber(collapsibleSectionDescriptor.orderHint) ? collapsibleSectionDescriptor.orderHint : 0);

		this._setupHeader(collapsibleSectionDescriptor);

		this._bodyElement = document.createElement('div');
		var bodyContentsElement = document.createElement('div');
		bodyContentsElement.classList.add('zE');
		this._bodyElement.appendChild(bodyContentsElement);

		this._element.appendChild(this._bodyElement);

		this._contentElement = document.createElement('div');
		bodyContentsElement.appendChild(this._contentElement);

		this._messageElement = document.createElement('div');
		bodyContentsElement.appendChild(this._messageElement);

		this._tableBodyElement = document.createElement('div');
		bodyContentsElement.appendChild(this._tableBodyElement);

		this._setupFooter(collapsibleSectionDescriptor);


		if(this._isCollapsible){
			Bacon.fromEventTarget(this._titleElement, 'click').onValue(this, '_toggleCollapseState');
		}

		Bacon.fromEventTarget(this._element, 'removeCollapsedContainer').onValue(this, '_destroyCollapsedContainer');
		Bacon.fromEventTarget(this._element, 'readdToCollapsedContainer').onValue(this, '_addToCollapsedContainer');

		this._eventStream.push({
			type: 'update',
			property: 'orderHint',
			sectionDescriptor: collapsibleSectionDescriptor
		});
	},

	_setupHeader: function(collapsibleSectionDescriptor){
		this._headerElement = document.createElement('div');
		this._headerElement.classList.add('inboxsdk__resultsSection_header');

		this._titleElement = document.createElement('div');
		this._titleElement.setAttribute('class', 'inboxsdk__resultsSection_title');

		var titleInnerHTML = '';

		if(this._isCollapsible){
			 titleInnerHTML += '<span class="Wp Wq"></span>';
		}


		if(this._isSearch){
			titleInnerHTML += '<h3 class="Wd">' + _.escape(collapsibleSectionDescriptor.title) + '</h3>';
		}
		else{
			this._headerElement.classList.add('Wg');
			titleInnerHTML += '<h3 class="Wr">' + _.escape(collapsibleSectionDescriptor.title) + '</h3>';
		}

		this._titleElement.innerHTML = titleInnerHTML;

		var floatRightElement = document.createElement('div');
		floatRightElement.classList.add('Cr');

		if(this._isSearch){
			floatRightElement.classList.add('Wg');
		}
		else{
			this._titleElement.classList.add('Wn');
		}

		this._headerElement.appendChild(this._titleElement);
		this._headerElement.appendChild(floatRightElement);
		this._element.appendChild(this._headerElement);
	},

	_setupFooter: function(collapsibleSectionDescriptor){
		this._footerElement = document.createElement('div');
		this._footerElement.classList.add('inboxsdk__resultsSection_footer');

		this._bodyElement.appendChild(this._footerElement);
	},

	_updateElement: function(collapsibleSectionDescriptor){
		if(this._collapsibleSectionDescriptor.orderHint !== collapsibleSectionDescriptor.orderHint){
			this._element.setAttribute('data-order-hint', _.isNumber(collapsibleSectionDescriptor.orderHint) ? collapsibleSectionDescriptor.orderHint : 0);

			this._eventStream.push({
				type: 'update',
				property: 'orderHint'
			});
		}
	},

	_updateHeader: function(collapsibleSectionDescriptor){
		if(this._isCollapsible || collapsibleSectionDescriptor.title || collapsibleSectionDescriptor.subtitle || collapsibleSectionDescriptor.titleLinkText || collapsibleSectionDescriptor.hasDropdown){
			this._headerElement.style.display = '';
		}
		else{
			this._headerElement.style.display = 'none';
		}
	},

	_updateTitle: function(collapsibleSectionDescriptor){
		if(this._collapsibleSectionDescriptor.title !== collapsibleSectionDescriptor.title){
			this._titleElement.querySelector('h3').textContent = collapsibleSectionDescriptor.title;
		}
	},

	_updateSubtitle: function(collapsibleSectionDescriptor){
		var subtitleElement = this._titleElement.querySelector('.inboxsdk__resultsSection_title_subtitle');
		if(!collapsibleSectionDescriptor.subtitle){
			if(subtitleElement){
				subtitleElement.remove();
			}
		}
		else if(this._collapsibleSectionDescriptor.subtitle !== collapsibleSectionDescriptor.subtitle){
			if(!subtitleElement){
				subtitleElement = document.createElement('span');
				subtitleElement.classList.add('inboxsdk__resultsSection_title_subtitle');
				this._titleElement.querySelector('h3').insertAdjacentElement('afterend', subtitleElement);
			}

			subtitleElement.textContent = '(' + collapsibleSectionDescriptor.subtitle + ')';
		}
	},

	_updateSummaryText: function(collapsibleSectionDescriptor){
		var summaryTextElement = this._headerElement.querySelector('.inboxsdk__resultsSection_header_summaryText');
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
					Bacon.fromEventTarget(summaryTextElement, 'click').map(function(){
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

				this._headerElement.querySelector('.Cr').insertAdjacentElement('afterbegin', summaryTextElement);
			}

			summaryTextElement.querySelector('b').textContent = collapsibleSectionDescriptor.titleLinkText;
		}
	},

	_updateDropdown: function(collapsibleSectionDescriptor){
		if(!collapsibleSectionDescriptor.hasDropdown || !collapsibleSectionDescriptor.onDropdownClick){
			if(this._inboxDropdownButtonView){
				this._inboxDropdownButtonView.destroy();
			}

			if(this._dropdownViewController){
				this._dropdownViewController.destroy();
			}
		}
		else if(collapsibleSectionDescriptor.hasDropdown && collapsibleSectionDescriptor.onDropdownClick){

			if(!this._inboxDropdownButtonView || !this._dropdownViewController){
				this._inboxDropdownButtonView = new InboxDropdownButtonView();
				this._dropdownViewController = new DropdownButtonViewController({
					buttonView: this._inboxDropdownButtonView,
					dropdownViewDriverClass: GmailDropdownView,
					dropdownShowFunction: collapsibleSectionDescriptor.onDropdownClick
				});

				this._headerElement.querySelector('.Cr').appendChild(this._inboxDropdownButtonView.getElement());
			}
			else if(collapsibleSectionDescriptor.onDropdownClick !== this._collapsibleSectionDescriptor.onDropdownClick){
				this._dropdownViewController.setDropdownShowFunction(collapsibleSectionDescriptor.onDropdownClick);
			}
		}
	},

	_updateContentElement: function(collapsibleSectionDescriptor){
		this._contentElement.innerHTML = '';

		if(collapsibleSectionDescriptor.contentElement){
			this._contentElement.style.display = '';
			this._contentElement.appendChild(collapsibleSectionDescriptor.contentElement);
		}
		else{
			this._contentElement.style.display = 'none';
		}
	},

	_updateTableRows: function(collapsibleSectionDescriptor){
		var tableRows = collapsibleSectionDescriptor.tableRows;

		this._tableBodyElement.innerHTML = '';

		if(!tableRows || tableRows.length === 0){
			this._tableBodyElement.style.display = 'none';
		}
		else{
			this._tableBodyElement.style.display = '';
			this._renderTable(tableRows);
		}
	},

	_renderTable: function(tableRows){
		var tableElement = document.createElement('table');
		tableElement.setAttribute('class', 'F cf zt');

		tableElement.innerHTML = _getTableHTML();
		this._tableBodyElement.appendChild(tableElement);

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
				Bacon
					.fromEventTarget(rowElement, 'click')
					.map({
						eventName: 'rowClicked',
						rowDescriptor: result
					})
			);
		});
	},

	_updateMessageElement: function(collapsibleSectionDescriptor){
		if(collapsibleSectionDescriptor.tableRows && collapsibleSectionDescriptor.tableRows.length > 0 || collapsibleSectionDescriptor.contentElement){
			this._messageElement.innerHTML = '';
			this._messageElement.style.display = 'none';
		}
		else if((collapsibleSectionDescriptor.tableRows && collapsibleSectionDescriptor.tableRows.length === 0) && !collapsibleSectionDescriptor.contentElement){
			this._showEmptyMessage();
		}
	},

	_showLoadingMessage: function(){
		this._messageElement.setAttribute('class', 'TB TC inboxsdk__resultsSection_loading');
		this._messageElement.innerHTML = 'loading...'; //TODO: localize
		this._messageElement.style.display = '';
	},

	_showEmptyMessage: function(){
		this._messageElement.setAttribute('class', 'TB TC');
		this._messageElement.innerHTML = 'No results found'; //TODO: localize
		this._messageElement.style.display = '';
	},

	_updateFooter: function(collapsibleSectionDescriptor){
		this._footerElement.innerHTML = '';

		if(!collapsibleSectionDescriptor.footerLinkText && !collapsibleSectionDescriptor.footerLinkIconUrl && !collapsibleSectionDescriptor.footerLinkIconClass){
			this._footerElement.style.display = 'none';
		}
		else{
			this._footerElement.style.display = '';

			var footerLinkElement = document.createElement('span');
			footerLinkElement.setAttribute('class', 'e Wb');
			footerLinkElement.textContent = collapsibleSectionDescriptor.footerLinkText;

			this._eventStream.plug(
				Bacon.fromEventTarget(footerLinkElement, 'click')
					 .map(() => {
					 	return {
					 		eventName: 'footerClicked',
					 		sectionDescriptor: this._collapsibleSectionDescriptor
					 	};
					 })
			);

			this._footerElement.appendChild(footerLinkElement);
			this._footerElement.insertAdjacentHTML('beforeend', '<br style="clear:both;">');
		}
	},

	_toggleCollapseState: function(){
		if(this._isCollapsed){
			this._expand();
		}
		else{
			this._collapse();
		}
	},

	_collapse: function(){
		this._element.classList.add('inboxsdk__resultsSection_collapsed');

		if(!this._isSearch){
			this._addToCollapsedContainer();
		}

		var arrowSpan = this._titleElement.children[0];
		arrowSpan.classList.remove('Wq');
		arrowSpan.classList.add('Wo');

		this._bodyElement.style.display = 'none';
		this._isCollapsed = true;

		this._eventStream.push({
			eventName: 'collapsed'
		});
	},

	_expand: function(){
		this._element.classList.remove('inboxsdk__resultsSection_collapsed');

		if(!this._isSearch){
			this._removeFromCollapsedContainer();
		}

		var arrowSpan = this._titleElement.children[0];
		arrowSpan.classList.remove('Wo');
		arrowSpan.classList.add('Wq');

		this._bodyElement.style.display = '';
		this._isCollapsed = false;

		this._eventStream.push({
			eventName: 'expanded'
		});
	},

	_addToCollapsedContainer: function(){
		this._headerElement.classList.remove('Wg');

		if(this._isCollapsedContainer(this._element.previousElementSibling) && this._isCollapsedContainer(this._element.nextElementSibling)){

			//we are surrounded by collapse containers, let's favor our previous sibling
			var otherCollapseContainer = this._element.nextElementSibling;
			this._element.previousElementSibling.children[1].appendChild(this._element);

			//now we need to "merge" the two collapse containers. This can be done by taking all the result sections out of the collapsed container
			//and calling our "recollapse" helper function on them
			var elementsToRecollapse = _.toArray(otherCollapseContainer.children[0].children).concat(_.toArray(otherCollapseContainer.children[1].children));

			this._pulloutSectionsFromCollapsedContainer(otherCollapseContainer);
			this._recollapse(elementsToRecollapse);
		}
		else {
			this._readdToCollapsedContainer();
		}
	},

	_removeFromCollapsedContainer: function(){
		this._headerElement.classList.add('Wg');
		var element = this._element;
		var container = element.parentElement.parentElement;

		if(!container.classList.contains('inboxsdk__results_collapsedContainer')){
			return;
		}

		var elementsToRecollapse = _.toArray(container.children[0].children).concat(_.toArray(container.children[1].children));
		this._pulloutSectionsFromCollapsedContainer(container);
		this._destroyCollapsedContainer();

		this._recollapse(elementsToRecollapse.filter(function(child){
			return child !== element;
		}));
	},

	_pulloutSectionsFromCollapsedContainer: function(container){
		var prependedChildren = _.toArray(container.children[0].children);
		_.each(prependedChildren, function(child){
			container.insertAdjacentElement('beforebegin', child);
		});

		var appendedChildren = _.toArray(container.children[1].children).reverse();
		_.each(appendedChildren, function(child){
			container.insertAdjacentElement('afterend', child);
		});
	},

	_readdToCollapsedContainer: function(){
		if(this._collapsedContainer){
			this._collapsedContainer.children[0].insertBefore(this._element, this._collapsedContainer.children[1].firstElementChild);
			return;
		}

		var collapsedContainer;
		var isPrepend;

		if(this._isCollapsedContainer(this._element.previousElementSibling)){
			isPrepend = false;
			collapsedContainer = this._element.previousElementSibling;
		}
		else if(this._isCollapsedContainer(this._element.nextElementSibling)){
			isPrepend = true;
			collapsedContainer = this._element.nextElementSibling;
		}
		else {
			isPrepend = true;
			this._createCollapsedContainer();
			collapsedContainer = this._collapsedContainer;
		}

		if(isPrepend){
			collapsedContainer.children[0].insertBefore(this._element, collapsedContainer.children[0].firstElementChild);
		}
		else{
			collapsedContainer.children[1].appendChild(this._element);
		}
	},

	_isCollapsedContainer: function(element){
		return element && element.classList.contains('inboxsdk__results_collapsedContainer');
	},

	_recollapse: function(children){
		_.each(children, function(child){
			var event = document.createEvent("CustomEvent");
			event.initCustomEvent('removeCollapsedContainer', false, false);
			child.dispatchEvent(event);

			event = document.createEvent("CustomEvent");
			event.initCustomEvent('readdToCollapsedContainer', false, false);
			child.dispatchEvent(event);
		});
	},

	_createCollapsedContainer: function(){
		this._collapsedContainer = document.createElement('div');
		this._collapsedContainer.setAttribute('class', 'inboxsdk__results_collapsedContainer Wg');
		this._collapsedContainer.innerHTML = '<div class="inboxsdk__results_collapsedContainer_prepend"></div><div class="inboxsdk__results_collapsedContainer_append"></div>';

		this._element.insertAdjacentElement('afterend', this._collapsedContainer);
	},

	_destroyCollapsedContainer: function(){
		if(this._collapsedContainer){
			this._collapsedContainer.remove();
			this._collapsedContainer = null;
		}
	}
});


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
				'<span class="zF">',
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
					_.escape(result.body || ''),
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
		'<div class="ar as" data-tooltip="' + _.escape(label.title) + '">',
			'<div class="at" style="background-color: ' + backgroundColor + '; border-color: ' + backgroundColor + ';">'
	];

	if(label.iconClass){
		retArray = retArray.concat([
			'<div class="inboxsdk__resultsSection_label_icon ' + label.iconClass + '"></div>'
		]);
	}
	else if(label.iconUrl){
		retArray = retArray.concat([
			'<img class="inboxsdk__resultsSection_label_icon" src="' + label.iconUrl + '" />'
		]);
	}


	retArray = retArray.concat([
				'<div class="av" style="color: ' + foregroundColor + '; ">',
					_.escape(label.title),
				'</div>',
			'</div>',
		'</div>'
	]);

	return retArray.join('');
}


module.exports = GmailCollapsibleSectionView;
