import _ from 'lodash';

// only used for constants
import {NATIVE_ROUTE_IDS, NATIVE_LIST_ROUTE_IDS, ROUTE_TYPES} from '../../../../constants/router';

export default function GmailRouteProcessor() {
	this._routeNameToRouteIDMap = null;
	this._compatibleRouteIDMap = null;

	this._setupRouteNameToRouteIDMap();
	this._setupCompatibleRouteIDMap();
}

_.extend(GmailRouteProcessor.prototype, {

	NativeRouteIDs: NATIVE_ROUTE_IDS,
	NativeListRouteIDs: NATIVE_LIST_ROUTE_IDS,
	RouteTypes: ROUTE_TYPES,

	isListRouteName: function(routeName){
		var routeID = this.getRouteID(routeName);
		if(!routeID){
			return false;
		}

		return _.includes(Object.values(NATIVE_LIST_ROUTE_IDS), routeID);
	},

	isSettingsRouteName: function(routeName){
		return this._routeNameToRouteIDMap[routeName] === this.NativeRouteIDs.SETTINGS;
	},

	isContactRouteName: function(routeName){
		return this._routeNameToRouteIDMap[routeName] === this.NativeRouteIDs.CONTACTS || this._routeNameToRouteIDMap[routeName] === this.NativeRouteIDs.CONTACT;
	},

	getRouteID: function(routeName){
		var routeID = this._routeNameToRouteIDMap[routeName];
		return routeID ? routeID : null;
	},

	getRouteName: function(routeID){
		for(var key in this._routeNameToRouteIDMaps){
			if(this._routeNameToRouteIDMap[key] === routeID){
				return key;
			}
		}

		return null;
	},

	isNativeRoute: function(routeName){
		return !!this._routeNameToRouteIDMap[routeName];
	},

	getCompatibleRouteID: function(routeID){
		return this._compatibleRouteIDMap[routeID] || routeID;
	},

	_setupRouteNameToRouteIDMap: function(){
		this._routeNameToRouteIDMap = {
			'inbox': this.NativeRouteIDs.INBOX,
			'section_query': this.NativeRouteIDs.SEARCH,
			'all': this.NativeRouteIDs.ALL_MAIL,
			'imp': this.NativeRouteIDs.IMPORTANT,
			'contacts': this.NativeRouteIDs.CONTACTS,
			'contact': this.NativeRouteIDs.CONTACT,
			'sent': this.NativeRouteIDs.SENT,
			'starred': this.NativeRouteIDs.STARRED,
			'drafts': this.NativeRouteIDs.DRAFTS,
			'label': this.NativeRouteIDs.LABEL,
			'category': this.NativeRouteIDs.LABEL,
			'search': this.NativeRouteIDs.SEARCH,
			'advanced-search': this.NativeRouteIDs.SEARCH,
			'trash': this.NativeRouteIDs.TRASH,
			'spam': this.NativeRouteIDs.SPAM,
			'apps': this.NativeRouteIDs.SEARCH,
			'circle': this.NativeRouteIDs.LABEL,
			'settings': this.NativeRouteIDs.SETTINGS,
			'chats': this.NativeRouteIDs.CHATS
		};
	},

	_setupCompatibleRouteIDMap: function(){
		this._compatibleRouteIDMap = {};
		this._compatibleRouteIDMap[this.NativeRouteIDs.INBOX] = 'inbox/p:page';
		this._compatibleRouteIDMap[this.NativeRouteIDs.ALL_MAIL] = 'all/p:page';
		this._compatibleRouteIDMap[this.NativeRouteIDs.SENT] = 'sent/p:page';
		this._compatibleRouteIDMap[this.NativeRouteIDs.STARRED] = 'starred/p:page';
		this._compatibleRouteIDMap[this.NativeRouteIDs.DRAFTS] = 'drafts/p:page';
		this._compatibleRouteIDMap[this.NativeRouteIDs.LABEL] = 'label/:labelName/p:page';
		this._compatibleRouteIDMap[this.NativeRouteIDs.TRASH] = 'trash/p:page';
		this._compatibleRouteIDMap[this.NativeRouteIDs.SPAM] = 'spam/p:page';
		this._compatibleRouteIDMap[this.NativeRouteIDs.IMPORTANT] = 'imp/p:page';
		this._compatibleRouteIDMap[this.NativeRouteIDs.SEARCH] = 'search/:query/p:page';
		this._compatibleRouteIDMap[this.NativeRouteIDs.THREAD] = this.NativeRouteIDs.THREAD;
		this._compatibleRouteIDMap[this.NativeRouteIDs.CHATS] = 'chats/p:page';
		this._compatibleRouteIDMap[this.NativeRouteIDs.CHAT] = this.NativeRouteIDs.CHAT;
		this._compatibleRouteIDMap[this.NativeRouteIDs.CONTACTS] = 'contacts/p:page';
		this._compatibleRouteIDMap[this.NativeRouteIDs.CONTACT] = this.NativeRouteIDs.CONTACT;
		this._compatibleRouteIDMap[this.NativeRouteIDs.SETTINGS] = this.NativeRouteIDs.SETTINGS;
	}

});
