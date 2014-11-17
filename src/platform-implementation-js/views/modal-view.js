var _ = require('lodash');
var BasicClass = require('../lib/basic-class');

var ModalView = function(modalViewController){
    BasicClass.call(this);

    this._modalViewController = modalViewController;
};

ModalView.prototype = Object.create(BasicClass.prototype);

_.extend(ModalView.prototype, {

    show: function(){
        //TODO: coordinate to make sure only one modal is visible
        this._modalViewController.show();
    },

    close: function(){
        this._modalViewController.close();
    },


    /*
     * options = {
     * 	iconUrl: ,
     * 	tooltip,
     * 	callback:
     * }
     */
    addButton: function(options){
        this._attachmentCardImplementation.addButton(options);
    }

});

module.exports = ModalView;
