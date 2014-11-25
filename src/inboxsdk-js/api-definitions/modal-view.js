var _ = require('lodash');

/**
* @class
* Represents a modal dialog.
*/
var ModalView = function(platformImplementationLoader){
    this._platformImplementationLoader = platformImplementationLoader;

    this._modalViewImplementation = null;
    this._closeEarly = false;
};

_.extend(ModalView.prototype, /** @lends ModalView */{

    show: function(options){
        var self = this;
        this._platformImplementationLoader.load().then(function(platformImplementation){
            if(!self._closeEarly){
                self._modalViewImplementation = platformImplementation.Modal.createModalView(options);
                self._modalViewImplementation.show();
            }
        });
    },

    /**
    * This closes the modal. Does nothing if already closed.
    * @return {void}
    */
    close: function(){
        if(this._modalViewImplementation && !this._closeEarly){
            this._modalViewImplementation.close();
        }

        this._closeEarly = true;
    }

});

module.exports = ModalView;
