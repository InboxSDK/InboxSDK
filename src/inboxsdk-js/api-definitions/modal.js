var _ = require('lodash');
var ModalView = require('./modal-view');


var Modal = function(platformImplementationLoader){
    this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(Modal.prototype, {

    show: function(options){
        var modalView = new ModalView(this._platformImplementationLoader);
        modalView.show(options);

        return modalView;
    }

});

module.exports = Modal;
