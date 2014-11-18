var _ = require('lodash');

module.exports = function(){
    var event = _.last(arguments);

    return _.chain(arguments)
            .initial()
            .any(function(key){
                return event.which === key;
            })
            .value();

};
