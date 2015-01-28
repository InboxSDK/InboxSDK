'use strict';

var _ = require('lodash');
var Bacon = require('baconjs');
var BasicClass = require('../../../lib/basic-class');
var Map = require('es6-unweak-collections').Map;

var makeMutationObserverStream = require('../../../lib/dom/make-mutation-observer-stream');

var KeyboardShortcutHelpModifier = function(){
	BasicClass.call(this);

	this._shortcuts = new Map();
	this._monitorKeyboardHelp();
};

KeyboardShortcutHelpModifier.prototype = Object.create(BasicClass.prototype);

_.extend(KeyboardShortcutHelpModifier.prototype, {

	__memberVariables: [
		{name: '_appId', destroy: false},
		{name: '_appIconUrl', destroy: false},
		{name: '_shortcuts', destroy: false}
	],

	set: function(gmailKeyboardShortcutHandle, shortcutDescriptor, appId, appIconUrl){
		this._initializeAppValues(appId, appIconUrl);

		this._shortcuts.set(gmailKeyboardShortcutHandle, shortcutDescriptor);
	},

	delete: function(gmailKeyboardShortcutHandle){
		this._shortcuts.delete(gmailKeyboardShortcutHandle);
	},

	_initializeAppValues: function(appId, appIconUrl){
		if(!this._appId){
			this._appId = appId;
		}

		if(!this._appIconUrl){
			this._appIconUrl = appIconUrl;
		}
	},

	_monitorKeyboardHelp: function(){
		makeMutationObserverStream(document.body, {childList: true})
			.filter(function(mutation){
				return mutation.addedNodes;
			})
			.flatMap(function(mutation){
				return Bacon.fromArray(_.toArray(mutation.addedNodes));
			})
			.startWith(document.querySelector('body > .wa'))
			.filter(function(node){
				return node && node.classList && node.classList.contains('wa');
			})
			.flatMap(function(node){
				return makeMutationObserverStream(node, {attributes: true, attributeFilter: ['class']})
						.filter(function(){
							return !node.classList.contains('aou');
						})
						.map(function(){
							return node;
						})
						.startWith(node);
			})
			.onValue(this, '_renderHelp');
	},

	_renderHelp: function(node){
		var keys = this._shortcuts.keys();
		if(keys.length === 0){
			return;
		}

		var header = this._renderHeader();
		var table = this._renderTable();

		var bodies = table.querySelectorAll('tbody tbody');

		var self = this;
		var index = 0;
		this._shortcuts.forEach(function(shortcutDescriptor){
			self._renderShortcut(bodies[index % 2], shortcutDescriptor);
		});

		var firstHeader = node.querySelector('.aov');
		firstHeader.insertAdjacentElement('beforebegin', header);
		firstHeader.insertAdjacentElement('beforebegin', table);
	},

	_renderHeader: function(){
		var header = document.createElement('div');
		header.setAttribute('class', 'aov  aox');
		header.innerHTML = [
			'<div class="aow">',
				'<span class="inboxsdk__shortcutHelp_title">',
					_.escape(this._appId),
				'</span>',
			'</div>'
		].join('');

		if(this._appIconUrl){
			var img = document.createElement('img');
			img.src = this._appIconUrl;
			img.setAttribute('class', 'inboxsdk__icon');

			var title = header.querySelector('.inboxsdk__shortcutHelp_title');
			title.insertBefore(img, title.firstChild);
		}

		return header;
	},

	_renderTable: function(){
		var table = document.createElement('table');
		table.setAttribute('cellpadding', '0');
		table.setAttribute('class', 'cf wd');

		table.innerHTML = [
			'<tbody>',
				'<tr>',
					'<td class="Dn">',
						'<table cellpadding="0" class="cf" style="table-layout: fixed;">',
							'<tbody>',
								'<tr><th>&nbsp;</th><th>&nbsp;</th></tr>',
							'</tbody>',
						'</table>',
					'</td>',
					'<td class="Dn">',
						'<table cellpadding="0" class="cf" style="table-layout: fixed;">',
							'<tbody>',
								'<tr><th>&nbsp;</th><th>&nbsp;</th></tr>',
							'</tbody>',
						'</table>',
					'</td>',
				'</tr',
			'</tbody>'
		].join('');

		return table;
	},

	_renderShortcut: function(tableBody, shortcutDescriptor){
		var shortcutRow = document.createElement('tr');
		shortcutRow.innerHTML = [
			'<td class="wg Dn"> ',
				_getShortcutHTML(shortcutDescriptor.chord),
			'</td>',
			'<td class="wg Dn"> ',
				_.escape(shortcutDescriptor.description || ""),
			'</td>'
		].join('');

		tableBody.appendChild(shortcutRow);
	}

});

function _getShortcutHTML(chord){
	var retArray = [];

	var parts = chord.split(/[\s+]/g);
	var separators = chord.match(/[\s+]/g);

	for(var ii=0; ii<parts.length; ii++){
		retArray.push('<span class="wh">' + _.escape(parts[ii]) + '</span>');
		retArray.push(_getSeparatorHTML(separators[ii]));
	}

	retArray.push(' :');

	return retArray.join('');
}

function _getSeparatorHTML(separator){
	switch (separator) {
		case ' ':
			return  '<span class="wb">then</span> ';
		case '+':
			return ' <span class="wb">+</span> ';
		default:
			return '';
	}
}


module.exports = KeyboardShortcutHelpModifier;
