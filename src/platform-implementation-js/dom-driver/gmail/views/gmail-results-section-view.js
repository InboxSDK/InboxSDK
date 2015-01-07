'use strict';

var _ = require('lodash');
var Bacon = require('baconjs');

var BasicClass = require('../../../lib/basic-class');


var InboxDropdownButtonView = require('../widgets/buttons/inbox-dropdown-button-view');
var GmailDropdownView = require('../widgets/gmail-dropdown-view');
var DropdownButtonViewController = require('../../../widgets/buttons/dropdown-button-view-controller');


var GmailResultsSectionView = function(groupOrderHint, isSearch){
	BasicClass.call(this);

	this._isSearch = isSearch;
	this._groupOrderHint = groupOrderHint;
	this._eventStream = new Bacon.Bus();
	this._collapsedContainer = null;
};

GmailResultsSectionView.prototype = Object.create(BasicClass.prototype);

_.extend(GmailResultsSectionView.prototype, {

	__memberVariables: [
		{name: '_groupOrderHint', destroy: false},
		{name: '_sectionDescriptor', destroy: false},
		{name: '_element', destroy: true, get: true},
		{name: '_isSearch', destroy: false},
		{name: '_headerElement', destroy: true},
		{name: '_titleElement', destroy: true},
		{name: '_bodyElement', destroy: true},
		{name: '_collapsedContainer', destroy: true},
		{name: '_messageDiv', destroy: true},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_isCollapsed', destroy: false, defaultValue: false},
		{name: '_inboxDropdownButtonView', destroy: true},
		{name: '_dropdownViewController', destroy: true}
	],

	setCollapsibleSectionDescriptorProperty: function(sectionDescriptorProperty){
		sectionDescriptorProperty.onValue(this, '_updateValues');
	},

	setCollapsed: function(value){
		if(value){
			this._collapse();
		}
		else{
			this._expand();
		}
	},

	setResults: function(resultArray){
		this._setResults(resultArray);
	},

	_updateValues: function(sectionDescriptor){
		if(!this._element){
			this._setupElement(sectionDescriptor);
		}
		else{
			this._updateElement(sectionDescriptor);
		}

		this._updateTitle(sectionDescriptor);
		this._updateSubtitle(sectionDescriptor);
		this._updateSummaryText(sectionDescriptor);
		this._updateDropdown(sectionDescriptor);

		this._sectionDescriptor = sectionDescriptor;
	},

	_setupElement: function(sectionDescriptor){
		this._element = document.createElement('div');
		this._element.setAttribute('class', 'inboxsdk__resultsSection');
		this._element.setAttribute('data-group-order-hint', this._groupOrderHint);
		this._element.setAttribute('data-order-hint', _.isNumber(sectionDescriptor.orderHint) ? sectionDescriptor.orderHint : 0);

		this._setupHeader(sectionDescriptor);

		this._bodyElement = document.createElement('div');
		this._element.appendChild(this._bodyElement);

		Bacon.fromEventTarget(this._titleElement, 'click').onValue(this, '_toggleCollapseState');
		Bacon.fromEventTarget(this._element, 'removeCollapsedContainer').onValue(this, '_destroyCollapsedContainer');
		Bacon.fromEventTarget(this._element, 'readdToCollapsedContainer').onValue(this, '_addToCollapsedContainer');

		this._eventStream.push({
			type: 'update',
			property: 'orderHint',
			sectionDescriptor: sectionDescriptor
		});
	},

	_setupHeader: function(sectionDescriptor){
		this._headerElement = document.createElement('div');
		this._headerElement.classList.add('inboxsdk__resultsSection_header');

		this._titleElement = document.createElement('div');
		this._titleElement.setAttribute('class', 'inboxsdk__resultsSection_title');

		var titleInnerHTML = '<span class="Wp Wq"></span>';

		if(this._isSearch){
			titleInnerHTML += '<h3 class="Wd">' + _.escape(sectionDescriptor.title) + '</h3>';
		}
		else{
			this._headerElement.classList.add('Wg');
			titleInnerHTML += '<h3 class="Wr">' + _.escape(sectionDescriptor.title) + '</h3>';
		}

		this._titleElement.innerHTML = titleInnerHTML;

		var floatRightElement = document.createElement('div');
		floatRightElement.classList.add('Cr');

		if(this._isSearch){
			floatRightElement.classList.add('Wg');
		}

		this._headerElement.appendChild(this._titleElement);
		this._headerElement.appendChild(floatRightElement);
		this._element.appendChild(this._headerElement);
	},

	_updateElement: function(sectionDescriptor){
		if(this._sectionDescriptor.orderHint !== sectionDescriptor.orderHint){
			this._element.setAttribute('data-order-hint', _.isNumber(sectionDescriptor.orderHint) ? sectionDescriptor.orderHint : 0);

			this._eventStream.push({
				type: 'update',
				property: 'orderHint'
			});
		}
	},

	_updateTitle: function(sectionDescriptor){
		if(this._sectionDescriptor.title !== sectionDescriptor.title){
			this._titleElement.querySelector('h3').textContent = sectionDescriptor.title;
		}
	},

	_updateSubtitle: function(sectionDescriptor){
		var subtitleElement = this._titleElement.querySelector('.inboxsdk__resultsSection_title_subtitle');
		if(!sectionDescriptor.subtitle){
			if(subtitleElement){
				subtitleElement.remove();
			}
		}
		else if(this._sectionDescriptor.subtitle !== sectionDescriptor.subtitle){
			if(!subtitleElement){
				subtitleElement = document.createElement('span');
				subtitleElement.classList.add('inboxsdk__resultsSection_title_subtitle');
				this._titleElement.querySelector('h3').insertAdjacentElement('afterend', subtitleElement);
			}

			subtitleElement.textContent = sectionDescriptor.subtitle;
		}
	},

	_updateSummaryText: function(sectionDescriptor){
		var summaryTextElement = this._titleElement.querySelector('.inboxsdk__resultsSection_header_summaryText');
		if(!sectionDescriptor.summaryText){
			if(summaryTextElement){
				summaryTextElement.remove();
			}
		}
		else if(sectionDescriptor.summaryText !== this._sectionDescriptor.summaryText){
			if(!summaryTextElement){
				summaryTextElement = document.createElement('div');
				summaryTextElement.classList.add('.inboxsdk__resultsSection_header_summaryText');

				this._titleElement.querySelector('.Cr').insertAdjacentElement('afterbegin', summaryTextElement);
			}

			summaryTextElement.textContent = sectionDescriptor.summaryText;
		}
	},

	_updateDropdown: function(sectionDescriptor){
		if(this._inboxDropdownButtonView){
			this._inboxDropdownButtonView.destroy();
		}

		if(this._dropdownViewController){
			this._dropdownViewController.destroy();
		}

		if(this._sectionDescriptor.hasDropdown && this._sectionDescriptor.onDropdownClick){
			this._inboxDropdownButtonView = new InboxDropdownButtonView();
			this._dropdownViewController = new DropdownButtonViewController({
				buttonView: this._inboxDropdownButtonView,
				dropdownViewDriverClass: GmailDropdownView,
				dropdownShowFunction: this._sectionDescriptor.onDropdownClick
			});

			this._headerElement.querySelector('.Cr').appendChild(this._inboxDropdownButtonView.getElement());
		}
	},

	_showLoading: function(){
		this._messageDiv = document.createElement('div');
		this._messageDiv.setAttribute('class', 'TB TC inboxsdk__resultsSection_loading');

		this._messageDiv.innerHTML = 'loading...'; //TODO: localize

		this._bodyElement.appendChild(this._messageDiv);
	},

	_setResults: function(resultArray){
		this._bodyElement.innerHTML = '';

		if(!resultArray || resultArray.length === 0){
			this._showEmpty();
			return;
		}

		this._renderResults(resultArray);
	},

	_showEmpty: function(){
		this._messageDiv = document.createElement('div');
		this._messageDiv.setAttribute('class', 'TB TC');

		this._messageDiv.innerHTML = 'No results found'; //TODO: localize
		this._bodyElement.appendChild(this._messageDiv);
	},

	_renderResults: function(resultArray){
		if(this._messageDiv){
			this._messageDiv.remove();
			this._messageDiv = null;
		}

		var tableElement = document.createElement('table');
		tableElement.setAttribute('class', 'F cf zt');

		tableElement.innerHTML = _getTableHTML();
		this._bodyElement.appendChild(tableElement);

		var tbody = tableElement.querySelector('tbody');
		var eventStream = this._eventStream;

		resultArray.forEach(function(result){
			var rowElement = document.createElement('tr');
			rowElement.setAttribute('class', 'zA zE');
			rowElement.innerHTML = _getRowHTML(result);

			tbody.appendChild(rowElement);

			eventStream.plug(
				Bacon
					.fromEventTarget(rowElement, 'click')
					.map({
						eventName: 'rowClicked',
						resultDescriptor: result
					})
			);
		});
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
				'<span class="ya35Wb">',
					_.escape(result.body || ''),
				'</span>',
			'</div>',
		'</td>'
	]);

	rowArr.push('<td class="xY"></td>');
	rowArr.push('<td class="xY xW"><span class="sehUKb">' + _.escape(result.extraText || '') + '</span></td>');

	return rowArr.join('');
}

module.exports = GmailResultsSectionView;
