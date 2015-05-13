'use strict';

var _ = require('lodash');

var ModalView = require('../widgets/modal-view');


var memberMap = new Map();

/**
* @class
* This UI component allows you to display modal dialogs. They are styled to look and feel native inside
* Gmail and Inbox. In order to be useful, you can insert an arbitrary HTMLElement for content of the modal,
* however, the SDK handles creating the DOM structure for the overall modal and its associated UI.
*/
function Widgets(appId, driver) {
    var members = {};
    memberMap.set(this, members);

    members.appId = appId;
    members.driver = driver;
}

_.assign(Widgets.prototype, /** @lends Widgets */{

  /**
  * This creates a {ModalView} and shows it.
  * @param {ModalOptions} options - The options to configure the returned {ModalView}.
  * @return {ModalView}
  */
	showModalView: function(options){
    var modalViewDriver = memberMap.get(this).driver.createModalViewDriver(options);
    var modalView = new ModalView({
      modalViewDriver: modalViewDriver
    });
		modalView.show();

		return modalView;
	}

});

module.exports = Widgets;


/**
* @class
* The options used to configure a modal when calling {Modal.show()}.
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
  * of {PRIMARY_ACTION}, see ModalButtonDescriptors docs
  * ^optional
  * ^default=[]
  * @type {ModalButtonDescriptors[]}
  */
  buttons:null
};




/**
* @class
* The options to use to configure buttons in a modal.
*/
var ModalButtonDescriptors = /** @lends ModalButtonDescriptors */{

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
  * This is called when the button is clicked, and gets passed an event object. The event object will have a modalView.
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
