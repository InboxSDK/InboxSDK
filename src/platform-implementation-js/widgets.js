var _ = require('lodash');

var ModalViewController = require('./widgets/modal-view-controller');
var ModalView = require('./views/modal-view');

var Widgets = function(appId, driver){

    this._appId = appId;
    this._driver = driver;

};

_.extend(Widgets.prototype, {

    createModal: function(options){
        //TODO: do some coordination to make sure only one modal is shown at a time
        var modalView = this._driver.createModalView(options);
        var modalViewController = new ModalViewController({
            modalView: modalView
        });

        return new ModalView(modalViewController);        
    }

});

module.exports = Widgets;
