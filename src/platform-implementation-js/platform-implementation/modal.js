var _ = require('lodash');

var ModalViewController = require('../widgets/modal-view-controller');
var ModalView = require('../views/modal-view');

var Modal = function(appId, driver){

    this._appId = appId;
    this._driver = driver;

};

_.extend(Modal.prototype, {

    createModalView: function(options){        
        var modalView = this._driver.createModalView(options);
        var modalViewController = new ModalViewController({
            modalView: modalView
        });

        return new ModalView(modalViewController);
    }

});

module.exports = Modal;
