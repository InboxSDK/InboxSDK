/* @flow */

const NATIVE_ROUTE_IDS = Object.freeze({
	'INBOX': 'inbox/:page',
	'ALL_MAIL': 'all/:page',
	'SENT': 'sent/:page',
	'STARRED': 'starred/:page',
	'DRAFTS': 'drafts/:page',
	'SNOOZED': 'snoozed',
	'DONE': 'done',
	'REMINDERS': 'reminders',
	'LABEL': 'label/:labelName/:page',
	'TRASH': 'trash/:page',
	'SPAM': 'spam/:page',
	'IMPORTANT': 'imp/:page',
	'SEARCH': 'search/:query/:page',
	'THREAD': 'inbox/:threadID',
	'CHATS': 'chats/:page',
	'CHAT': 'chats/:chatID',
	'CONTACTS': 'contacts/:page',
	'CONTACT': 'contacts/:contactID',
	'SETTINGS': 'settings/:section',
	'ANY_LIST': '*'
});
exports.NATIVE_ROUTE_IDS = NATIVE_ROUTE_IDS;

const NATIVE_LIST_ROUTE_IDS = Object.freeze({
	'INBOX': NATIVE_ROUTE_IDS.INBOX,
	'ALL_MAIL': NATIVE_ROUTE_IDS.ALL_MAIL,
	'SENT': NATIVE_ROUTE_IDS.SENT,
	'STARRED': NATIVE_ROUTE_IDS.STARRED,
	'DRAFTS': NATIVE_ROUTE_IDS.DRAFTS,
	'SNOOZED': NATIVE_ROUTE_IDS.SNOOZED,
	'DONE': NATIVE_ROUTE_IDS.DONE,
	'REMINDERS': NATIVE_ROUTE_IDS.REMINDERS,
	'LABEL': NATIVE_ROUTE_IDS.LABEL,
	'TRASH': NATIVE_ROUTE_IDS.TRASH,
	'SPAM': NATIVE_ROUTE_IDS.SPAM,
	'IMPORTANT': NATIVE_ROUTE_IDS.IMPORTANT,
	'SEARCH': NATIVE_ROUTE_IDS.SEARCH,
	'ANY_LIST': NATIVE_ROUTE_IDS.ANY_LIST
});
exports.NATIVE_LIST_ROUTE_IDS = NATIVE_LIST_ROUTE_IDS;

const ROUTE_TYPES = Object.freeze({
	'LIST': 'LIST',
	'THREAD': 'THREAD',
	'SETTINGS': 'SETTINGS',
	'CHAT': 'CHAT',
	'CUSTOM': 'CUSTOM',
	'UNKNOWN': 'UNKNOWN'
});
exports.ROUTE_TYPES = ROUTE_TYPES;
