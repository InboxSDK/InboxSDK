'use strict';

import _ from 'lodash';
import Bacon from 'baconjs';
import BasicClass from '../../../lib/basic-class';
import baconFlatten from '../../../lib/bacon-flatten';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';
import makeMutationObserverChunkedStream from '../../../lib/dom/make-mutation-observer-chunked-stream';

function KeyboardShortcutHelpModifier() {
	BasicClass.call(this);

	this._shortcuts = new Map();
	this._monitorKeyboardHelp();
}

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
		makeElementChildStream(document.body)
			.map(event => event.el)
			.filter(node =>
				node && node.classList && node.classList.contains('wa')
			)
			.flatMap(node =>
				makeMutationObserverChunkedStream(node, {attributes: true, attributeFilter: ['class']})
					.filter(() =>
						!node.classList.contains('aou')
					)
					.map(() => node)
					.toProperty(node)
			)
			.onValue(this, '_renderHelp');
	},

	_renderHelp: function(node){
		if(this._shortcuts.size === 0){
			return;
		}

		var keys = this._shortcuts.keys();

		var header = this._renderHeader();
		var table = this._renderTable();

		var bodies = table.querySelectorAll('tbody tbody');

		var self = this;
		var index = 0;
		this._shortcuts.forEach(function(shortcutDescriptor){
			self._renderShortcut(bodies[index % 2], shortcutDescriptor);
			index++;
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
					_.escape(this._appId) + ' keyboard shortcuts',
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
		table.setAttribute('class', 'cf wd inboxsdk__shortcutHelp_table');

		table.innerHTML = [
			'<tbody>',
				'<tr>',
					'<td class="Dn">',
						'<table cellpadding="0" class="cf">',
							'<tbody>',
								'<tr><th>&nbsp;</th><th>&nbsp;</th></tr>',
							'</tbody>',
						'</table>',
					'</td>',
					'<td class="Dn">',
						'<table cellpadding="0" class="cf">',
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
			'<td class="we Dn"> ',
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
		retArray.push('<span class="wh">' + _.escape(_getAngledBracket(parts[ii])) + '</span>');
		retArray.push(_getSeparatorHTML(separators[ii]));
	}

	retArray.push(' :');

	return retArray.join('');
}

function _getAngledBracket(chordChar){
	switch(chordChar.toLowerCase()){
		case 'shift':
			return '<Shift>';
		case 'ctrl':
			return '<Ctrl>';
		case 'meta':
		case 'command':
			return '<⌘>';
		default:
			return chordChar;
	}
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
