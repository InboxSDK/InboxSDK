var _ = require('lodash');
var Bacon = require('baconjs');

var BasicClass = require('../../../lib/basic-class');

var GmailResultsSectionView = function(resultsDescriptor){
	BasicClass.call(this);

	this._resultsDescriptor = resultsDescriptor;
	this._eventStream = new Bacon.Bus();

	this._setupElement();
	if(resultsDescriptor.startCollapsed){
		this._collapse();
	}
	else{
		this._expand();
	}

	this._showLoading();

	if(!resultsDescriptor.results){
		return;
	}
	else if(_.isArray(resultsDescriptor.results)){
		this._setResults(resultsDescriptor.results);
	}
	else if(_.isFunction(resultsDescriptor.results.then)){
		resultsDescriptor.then(this._setResults.bind(this));
	}

};

GmailResultsSectionView.prototype = Object.create(BasicClass.prototype);

_.extend(GmailResultsSectionView.prototype, {

	__memberVariables: [
		{name: '_element', destroy: true, get: true},
		{name: '_titleElement', destroy: true},
		{name: '_bodyElement', destroy: true},
		{name: '_resultsDescriptor', destroy: false},
		{name: '_messageDiv', destroy: true},
		{name: '_eventStream', destroy: true, get: true, destroyFunction: 'end'},
		{name: '_isCollapsed', destroy: false, defaultValue: false}
	],

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

	_setupElement: function(){
		this._element = document.createElement('div');
		this._element.setAttribute('class', 'inboxsdk__resultsSection');

		this._titleElement = document.createElement('div');
		this._titleElement.setAttribute('class', 'Wc inboxsdk__resultsSection_title');
		this._titleElement.innerHTML = '<span class="Wp"></span><h3 class="Wd">' + this._resultsDescriptor.name + '</h3>';
		this._element.appendChild(this._titleElement);

		this._bodyElement = document.createElement('div');
		this._element.appendChild(this._bodyElement);

		Bacon.fromEventTarget(this._titleElement, 'click').onValue(this, '_toggleCollapseState');
	},

	_showLoading: function(){
		this._messageDiv = document.createElement('div');
		this._messageDiv.setAttribute('class', 'TB TC inboxsdk__resultsSection_loading');

		this._messageDiv.innerHTML = 'loading...'; //TODO: localize

		this._bodyElement.appendChild(this._messageDiv);
	},

	_setResults: function(resultArray){
		this._bodyElement.innerHTML = '';

		if(this._messageDiv){
			this._messageDiv.remove();
			this._messageDiv = null;
		}

		if(!resultArray || resultArray.length === 0){
			this._showEmpty();
			return;
		}

		this._renderResults(resultArray);
	},

	_showEmpty: function(){
		this._messageDiv.innerHTML = 'No results found'; //TODO: localize
		this._messageDiv.classList.remove('inboxsdk__resultsSection_loading');

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
		var arrowSpan = this._titleElement.querySelector('span');
		arrowSpan.classList.remove('Wq');
		arrowSpan.classList.add('Wo');

		this._bodyElement.style.display = 'none';
		this._isCollapsed = true;

		this._eventStream.push({
			eventName: 'collapsed'
		});
	},

	_expand: function(){
		var arrowSpan = this._titleElement.querySelector('span');
		arrowSpan.classList.remove('Wo');
		arrowSpan.classList.add('Wq');

		this._bodyElement.style.display = '';
		this._isCollapsed = false;

		this._eventStream.push({
			eventName: 'expanded'
		});
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
