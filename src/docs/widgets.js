/**
* @class
* This namespace contains functions for creating various widgets that are
* styled to look and feel native to Gmail and Inbox.
*/
var Widgets = /** @lends Widgets */{

  /**
   * This creates a {ModalView} and shows it. You can insert an arbitrary HTMLElement
   * for content of the modal.
   * @param {ModalOptions} options - The options to configure the returned {ModalView}.
   * @return {ModalView}
   */
	showModalView: function(){},

  /**
   * This creates a {MoleView} and shows it. A mole view is a modal that is
   * attached to the bottom of the viewport and has minimize and close buttons
   * just like a compose view.
   * @param {MoleOptions} options - The options to configure the returned {MoleView}.
   * @return {MoleView}
   */
  showMoleView: function() {},

  // TODO document or remove?
  showTopMessageBarView: function(){}

};

/**
* @class
* The options used to configure a modal when calling {Widgets.showModalView()}.
*/
var ModalOptions = /** @lends ModalOptions */{

  /**
  * An HTMLElement representing the content you\'d like to put inside the modal
  * @type {HTMLElement}
  */
  el:null,

  /**
  * Whether to show the close (X) button in the top right of the Modal as well as padding around your content.
  * ^optional
  * ^default=true
  * @type {boolean}
  */
  chrome:null,

  /**
  * Text to show as the title of the modal
  * ^optional
  * ^default=''
  * @type {string}
  */
  title:null,

  /**
  * An array of buttons to add to the modal. The UI will be consistent with native Gmail/Inbox buttons.
  * If none are provided, your el will occupy all of the modal. There may only be one button with a type
  * of {PRIMARY_ACTION}, see ModalButtonDescriptor docs
  * ^optional
  * ^default=[]
  * @type {ModalButtonDescriptor[]}
  */
  buttons:null
};

/**
* @class
* The options to use to configure buttons in a modal.
*/
var ModalButtonDescriptor = /** @lends ModalButtonDescriptor */{

  /**
  * The text displayed in the button.
  * @type {string}
  */
  text:null,

  /**
  * Text to show when the user hovers the mouse over the button.
  * @type {string}
  */
  title:null,

  /**
  * This is called when the button is clicked.
  * @type {function(event)}
  */
  onClick:null,

  /**
  * There are currently two supported types of modal buttons, {PRIMARY_ACTION} and {SECONDARY} action.
  * There may only be one {PRIMARY_ACTION} button per modal.
  * ^optional
  * ^default=SECONDARY_ACTION
  * @type {string}
  */
  type:null,

  /**
  * If multiple buttons are placed next to each other, then they will be ordered by this value.
  * ^optional
  * ^default=0
  * @type {number}
  */
  orderHint:null
};

/**
* @class
* The options used to configure a modal when calling {Widgets.showMoleView()}.
*/
var MoleOptions = /** @lends MoleOptions */{
  /**
  * An HTMLElement representing the content to put inside the mole view.
  * @type {HTMLElement}
  */
  el:null,

  /**
  * Text that the modal should start with as the title.
  * ^optional
  * ^default=''
  * @type {string}
  */
  title:null,

  /**
  * An HTMLElement to place in the title bar instead of the title text.
  * ^optional
  * @type {HTMLElement}
  */
  titleEl:null,

  /**
  * An HTMLElement to place in the title bar when the mole is minimized instead
  * of the title text.
  * ^optional
  * @type {HTMLElement}
  */
  minimizedTitleEl:null,

  /**
  * Extra CSS class names to add to the mole widget.
  * ^optional
  * ^default=''
  * @type {string}
  */
  className:null,

  /**
  * An array of buttons to add to the mole widget between the minimize and
  * close buttons in the title bar.
  * ^optional
  * ^default=[]
  * @type {MoleButtonDescriptor[]}
  */
  titleButtons:null
};

/**
* @class
* The options to use to configure buttons in a mole.
*/
var MoleButtonDescriptor = /** @lends MoleButtonDescriptor */{
  /**
  * Text to show when the user hovers the mouse over the button.
  * @type {string}
  */
  title:null,

  /**
  * URL for the icon to show on the button. Should be a local extension file
  * URL or a HTTPS URL. The image will be displayed with a height and width of
  * 24px.
  * @type {string}
  */
  iconUrl:null,

  /**
  * An optional class to apply to the icon.
  * ^optional
  * @type {string}
  */
  iconClass:null,

  /**
  * This is called when the button is clicked.
  * @type {function(event)}
  */
  onClick:null
};
