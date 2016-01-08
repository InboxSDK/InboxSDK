/**
* @class
* Represents a modal dialog.
*/
var ModalView = /** @lends ModalView */{

    show: function(){},

    setTitle: function(){},

    /**
    * This closes the modal. Does nothing if already closed.
    * @return {void}
    */
    close: function(){},

    /**
     * This property is set to true once the view is destroyed.
     * @type {boolean}
     */
    destroyed: false,

    /**
     * Fires when this ModalView instance is closed.
     * @event ModalView#destroy
     */

};
