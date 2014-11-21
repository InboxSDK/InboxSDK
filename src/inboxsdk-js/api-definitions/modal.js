var _ = require('lodash');
var ModalView = require('./modal-view');


var Modal = function(platformImplementationLoader){
    this._platformImplementationLoader = platformImplementationLoader;
};

_.extend(Modal.prototype, {

    /*
     *
       options = {
         title: string,
         el: string or Element,
         chrome: true/false, false = no padding or X button
         buttons: [
           {
             isPrimary: true/false, only one primary button allowed
           }
         ],
       }


     */

    show: function(options){
        var modalView = new ModalView(this._platformImplementationLoader);
        modalView.show(options);

        return modalView;
    }

});

module.exports = Modal;
