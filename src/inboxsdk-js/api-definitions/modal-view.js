var _ = require('lodash');

var ModalView = function(platformImplementationLoader){
    this._platformImplementationLoader = platformImplementationLoader;

    this._modalViewImplementation = null;
    this._closeEarly = false;
};

_.extend(ModalView.prototype, {

    show: function(options){
        var self = this;
        this._platformImplementationLoader.load().then(function(platformImplementation){
            if(!self._closeEarly){
                self._modalViewImplementation = platformImplementation.Modal.createModalView(options);
                self._modalViewImplementation.show();
            }
        });
    },

    close: function(){
        if(this._modalViewImplementation && !this._closeEarly){
            this._modalViewImplementation.close();
        }

        this._closeEarly = true;
    }

});

module.exports = ModalView;
