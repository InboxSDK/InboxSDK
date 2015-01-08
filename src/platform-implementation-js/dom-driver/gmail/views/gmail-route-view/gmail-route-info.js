'use strict';

var threadListRouteNames = [
    'inbox',
    'section_query',
	'all',
	'imp',
	'sent',
	'starred',
	'drafts',
	'label',
	'search',
	'advanced-search',
	'trash',
	'spam',
	'apps',
	'circle',
	'chats'
];


var routeIDs = {};
Object.defineProperties(routeIDs, {
	'Inbox': {
		value: 'inbox/:page',
		writable: false
	},

	'All_Mail': {
		value: 'all/:page',
		writable: false
	},

	'Sent': {
		value: 'sent/:page',
		writable: false
	},

	'Starred': {
		value: 'starred/:page',
		writable: false
	},

	'Drafts': {
		value: 'drafts/:page',
		writable: false
	},

	'Label': {
		value: 'label/:labelName/:page',
		writable: false
	},

	'Trash': {
		value: 'trash/:page',
		writable: false
	},

	'Spam': {
		value: 'spam/:page',
		writable: false
	},

	'Important': {
		value: 'imp/p:page',
		writable: false
	},

	'Search': {
		value: 'search/:query/:page',
		writable: false
	},

	'Thread': {
		value: 'inbox/:threadID',
		writable: false
	},

	'Chats': {
		value: 'chats/:page',
		writable: false
	},

	'Chat': {
		value: 'chats/:chatID',
		writable: false
	},

	'Contacts': {
		value: 'contacts/:page',
		writable: false
	},

	'Contact': {
		value: 'contacts/:contactID',
		writable: false
	},

	'Settings': {
		value: 'settings/:section',
		writable: false
	},

	'ANY_LIST': {
		value: '*',
		writable: false
	}
});

var compatibleRouteIDs = {};
compatibleRouteIDs[routeIDs.Inbox] = 'inbox/p:page';
compatibleRouteIDs[routeIDs.All_Mail] = 'all/p:page';
compatibleRouteIDs[routeIDs.Sent] = 'sent/p:page';
compatibleRouteIDs[routeIDs.Starred] = 'starred/p:page';
compatibleRouteIDs[routeIDs.Drafts] = 'drafts/p:page';
compatibleRouteIDs[routeIDs.Label] = 'label/:labelName/p:page';
compatibleRouteIDs[routeIDs.Trash] = 'trash/p:page';
compatibleRouteIDs[routeIDs.Spam] = 'spam/p:page';
compatibleRouteIDs[routeIDs.Important] = 'imp/p:page';
compatibleRouteIDs[routeIDs.Search] = 'search/:query/p:page';
compatibleRouteIDs[routeIDs.Thread] = routeIDs.Thread;
compatibleRouteIDs[routeIDs.Chats] = 'chats/p:page';
compatibleRouteIDs[routeIDs.Chat] = routeIDs.Chat;
compatibleRouteIDs[routeIDs.Contacts] = 'contacts/p:page';
compatibleRouteIDs[routeIDs.Contact] = routeIDs.Contact;
compatibleRouteIDs[routeIDs.Settings] = routeIDs.Settings;



var routeNames = {
	'inbox': routeIDs.Inbox,
	'section_query': routeIDs.Search,
	'all': routeIDs.All_Mail,
	'imp': routeIDs.Important,
	'contacts': routeIDs.Contacts,
	'contact': routeIDs.Contact,
	'sent': routeIDs.Sent,
	'starred': routeIDs.Starred,
	'drafts': routeIDs.Drafts,
	'label': routeIDs.Label,
	'category': routeIDs.Label,
	'search': routeIDs.Search,
	'advanced-search': routeIDs.Search,
	'trash': routeIDs.Trash,
	'spam': routeIDs.Spam,
	'apps': routeIDs.Search,
	'circle': routeIDs.Label,
	'settings': routeIDs.Settings,
	'chats': routeIDs.Chats
};


var routeTypes = {
	List: {},
	Thread: {},
	Settings: {},
	Chat: {},
	Custom: {},
	Unknown: {}
};


for(var key in routeIDs){
	Object.freeze(routeIDs[key]);
}

Object.freeze(routeIDs);
Object.freeze(routeNames);
Object.freeze(routeTypes);



module.exports = {

	isListRouteName: function(routeName){
		return threadListRouteNames.indexOf(routeName) > -1;
	},

	isSettingsRouteName: function(routeName){
		return routeNames[routeName] === routeIDs.Settings;
	},

	getRouteID: function(routeName){
		var routeID = routeNames[routeName];
		return routeID ? routeID : null;
	},

	getRouteName: function(routeID){
		for(var key in routeNames){
			if(routeNames[key] === routeID){
				return key;
			}
		}

		return null;
	},

	isNativeRoute: function(routeName){
		return !!routeNames[routeName];
	},

	getCompatibleRouteID: function(routeID){
		return compatibleRouteIDs[routeID] || routeID;
	},

	ROUTE_IDS: routeIDs,

	ROUTE_TYPES: routeTypes

};
