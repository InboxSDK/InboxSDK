/**
* @class
* This namespace contains functions for creating various widgets that are
* styled to look and feel native to Gmail and Inbox.
*/
var Widgets = /** @lends Widgets */{

  /**
   * This creates a {ModalView} and shows it. You can insert an arbitrary HTMLElement
   * for content of the modal.
   * ^gmail
   * ^inbox
   * @param {ModalOptions} options - The options to configure the returned {ModalView}.
   * @return {ModalView}
   */
  showModalView: function(){},

  /**
   * This creates a {MoleView} and shows it. A mole view is a modal that is
   * attached to the bottom of the viewport and has minimize and close buttons
   * just like a compose view.
   * ^gmail
   * ^inbox
   * @param {MoleOptions} options - The options to configure the returned {MoleView}.
   * @return {MoleView}
   */
  showMoleView: function() {},

  // TODO document or remove?
  showTopMessageBarView: function(){},

  /**
   * This creates a {DrawerView} and shows it. A drawer view is a panel that
   * slides in from the right side of the screen, and it fades the rest of the
   * screen out. By default, it has a title and a close button.
   * ^gmail
   * ^inbox
   * @param {DrawerOptions} options - The options to configure the returned {DrawerView}.
   * @return {DrawerView}
   */
  showDrawerView: function() {},
};

/**
* @class
* The options used to configure a modal when calling {Widgets.showModalView()}.
*/
var ModalOptions = /** @lends ModalOptions */{

  /**
  * An HTMLElement representing the content you'd like to put inside the modal
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
  * When chrome is set to false, this option controls whether a close (X) button should be added to the modal anyway.
  * If chrome is set to true then this property doesn't do anything.
  * ^optional
  * ^default=false
  * @type {boolean}
  */
  showCloseButton:null,

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
  titleButtons:null,

  /**
  * When chrome is set to false then the header of the mole is not rendered. This includes
  * the title and mimize/close buttons. This means the app is totally responsible for the
  * look and behavior of the mole, while the SDK is responsible only for the positioning.
  * ^optional
  * ^default=true
  * @type {boolean}
  */
  chrome:null
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
  * @type {function()}
  */
  onClick:null
};

/**
* @class
* The options used to configure a drawer when calling {Widgets.showDrawerView()}.
*/
var DrawerOptions = /** @lends ModalOptions */{

  /**
  * An HTMLElement representing the content you'd like to put inside the drawer.
  * Use the CSS property "flex-grow: 1" on it if you want it to expand to the
  * available space in the drawer.
  * @type {HTMLElement}
  */
  el:null,

  /**
  * Whether to show the close (X) button and the title at the top of the drawer.
  * ^optional
  * ^default=true
  * @type {boolean}
  */
  chrome:null,

  /**
  * Text to show as the title of the drawer. Not shown if chrome is set to false.
  * ^optional
  * @type {string}
  */
  title:null,

  /**
  * You can optionally specify a ComposeView to associate with the DrawerView.
  * The ComposeView will be interactable next to the DrawerView instead of
  * being blocked. Using this option will animate the ComposeView into position
  * along with the opening DrawerView unlike the
  * {DrawerView.associateComposeView()} method.
  * ^optional
  * @type {ComposeView}
  */
  composeView:null,

  /**
  * If this is true, then if any associated ComposeView is closed or otherwise
  * becomes inaccessible, then the DrawerView will close too.
  * ^optional
  * ^default=false
  * @type {boolean}
  */
  closeWithCompose:null,

  /**
  * Whether or not to close the DrawerView when its associated ComposeView is
  * minimized. This will default to the value of closeWithCompose.
  * ^optional
  * ^default=false
  * @type {boolean}
  */
  closeOnMinimize:null
};
