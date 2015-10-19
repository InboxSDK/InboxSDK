/**
* @class
* The Toolbar namespace allows you to add your own buttons and actions to various toolbars in Gmail or
* Inbox. Toolbars appear in various Lists, ThreadViews and MessageViews. Within a toolbar, you have control
* over the placement of your buttons.
*
* Toolbar buttons are typically used to take actions on the email(s) that the toolbar applies to. Do not use
* this API to add buttons that don't take a direct action on the selected email.
*
* Since toolbar buttons only apply to emails, they will ONLY appear when an email is selected or you are
* on a ThreadView.
*/
var Toolbars = /** @lends Toolbars */ {

	/**
	* Registers a toolbar button to appear in any List such as the Inbox or Sent Mail.
	* @param {ToolbarButtonDescriptor} toolbarButtonDescriptor - The options for the button.
	* @return {void}
	*/
	registerToolbarButtonForList: function(){},

	/**
	* Registers a toolbar button to appear in a conversation view.
	* @param {ToolbarButtonDescriptor} toolbarButtonDescriptor - The options for the button.
	* @return {void}
	*/
	registerToolbarButtonForThreadView: function(){},

	/**
	* Adds a button *and* dropdown to the "Global Toolbar". This is typically used to show a dropdown with general information
	* about your application. In Gmail this refers to the navigation area at the top right of the window and in
	*  Inbox it refers to the top level toolbar. Your application can only set one app toolbar button.
	* @param {AppToolbarButtonDescriptor} appToolbarButtonDescriptor - The options for the app toolbar button
	* @return {AppToolbarButtonView}
	*/
	setAppToolbarButton: function(){},

  // TODO document or remove?
	addToolbarButtonForApp: function(){}

};

/**
* The different toolbar sections that exist
* @class
* @name SectionNames
*/
var sectionNames = Object.freeze(/** @lends SectionNames */ {

	/**
	* The section is for buttons that move emails out of or into the users inbox
	* @type string
	*/
	'INBOX_STATE': 'INBOX_STATE',

	/**
	* This section is for buttons that alter metadata of emails. Common examples are labeling or moving an email.
	* @type string
	*/
	'METADATA_STATE': 'METADATA_STATE',

	/**
	* This sectiom is used for other actions. Typically these will be placed in the "More"
	* menu in Gmail or in submenus in Inbox.
	* @type string
	*/
	'OTHER': 'OTHER'

});


/**
* @class
* This type is passed into the {Toolbars.registerToolbarButtonForList()} and
* {Toolbars.registerToolbarButtonForThreadView()} method as a way to configure
* the toolbar button shown.
*/
var ToolbarButtonDescriptor = /** @lends ToolbarButtonDescriptor */{

	/**
	* Text to show when the user hovers the mouse over the button, or to show on
	* the button when the user has the Gmail "Button labels" setting set to
	* "Text".
	* @type {string}
	*/
	title:null,

	/**
	* URL for the icon to show on the button. Should be a local extension file URL or a HTTPS URL. While iconUrl is an optional parameter at least one of iconUrl or iconClass is required.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	iconUrl:null,

	/**
	* An optional class to apply to the icon. While iconClass is an optional parameter at least one of iconUrl or iconClass is required.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	iconClass: null,

	/**
	* The section of the toolbar to place the button.
	* @type {SectionNames}
	*/
	section:null,

	/**
	* This is called when the button is clicked, and gets passed an event object. If this was registered with {Toolbars.registerToolbarButtonForList()}, then
	* the event object will have a {selectedThreadRowViews} ({ThreadRowView[]}) property and a {threadRowViews} ({ThreadRowView[]}) property.
	* If this was registered with {Toolbars.registerToolbarButtonForThreadView()}, then the event object will have a {threadView} ({ThreadView}) property.
	* In both cases the event object will optionally have a {dropdown} ({DropdownView}) property if you set the {hasDropdown} property to true on the descriptor
	* @type {func(event)}
	*/
	onClick:null,

	/**
	* If true, the button will open a dropdown menu above it, and the event object will have a {dropdown} property of type {DropdownView} that
	* allows the dropdown to be customized when opened.
	* ^optional
	* ^default=false
	* @type {boolean}
	*/
	hasDropdown:null,

	/**
	* A function that determines when this toolbar button should be hidden. You may want to hide the
	* toolbar button on certain Routes or in certain conditions. The function should return true when
	* the toolbar button should be hidden. Your function is passed a {RouteView}.
	* ^optional
	* ^default=null
	* @type {func(RouteView)}
	*/
	hideFor:null,

	/**
	* The keyboard shortcut that will activate this button.
	* ^optional
	* ^default=null
	* @type {keyboardShortcutHandle}
	*/
	 keyboardShortcutHandle: null
};


/**
* @class
* This type is passed into the {Toolbars.setAppToolbarButton()} method as a way to configure
* the toolbar button shown.
*/
var AppToolbarButtonDescriptor = /** @lends AppToolbarButtonDescriptor */{

	/**
	* Text to show when the user hovers the mouse over the button
	* @type {string}
	*/
	title:null,

	/**
	* URL for the icon to show on the button. Should be a local extension file URL or a HTTPS URL.
	* @type {string}
	*/
	iconUrl:null,

	/**
	* An optional class to apply to the icon.
	* ^optional
	* ^default=null
	* @type {string}
	*/
	iconClass: null,

	/**
	* This is called when the button is clicked, and gets passed an event object. The event object will have
	* a {dropdown} ({DropdownView}) property.
	* @type {func(event)}
	*/
	onClick:null,

	/**
	* The color to use for the top arrow of the dropdown. Useful if you want the contents of
	* your dropdown to have a specific background color
	* ^optional
	* ^default=null
	* @type {string}
	*/
	arrowColor: null
};
