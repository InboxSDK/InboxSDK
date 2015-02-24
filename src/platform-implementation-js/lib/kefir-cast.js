var once = require('lodash.once');
var noop = require('lodash.noop');
var constant = require('lodash.constant');

function kefirCast(Kefir, input){

	if(_isBaconStream(input)){
		return Kefir.fromBinder(function(emitter){
			return input.subscribe(function(event){
				if (event.hasValue()) {
					emitter.emit(event.value());
		        } else if (event.isEnd()) {
		        	emitter.end();
		        } else if (event.isError()) {
		        	emitter.error(event.error);
		        } else {
		          console.error("Unknown type of Bacon event", event);
		        }
			});
		});
	}
	else if(_isRxJSStream(input)){
		return Kefir.fromBinder(function(emitter) {
	      var unsub;
	      input.takeUntil({
	        then: function(cb) {
	          unsub = once(function() {
	            emitter.emit = noop; // Avoid sinking the End event that cb() will trigger
	            cb();
	          });
	        }
	      }).subscribe(function onNext(value) {
	      	emitter.emit(constant(value));
	      }, function onError(err) {
	      	emitter.error(err);
	      }, function onCompleted() {
	      	emitter.end();
	      });

	      return unsub;
	    });
	}
	else if(_isKefirStream(input)){

	}
	else{
		return Kefir.constant(input);
	}

}

function _isBaconStream(input){
	return input && input.subscribe && input.onValue && input.takeUntil;
}

function _isKefirStream(input){
	return input && input.subscribe && input.onValue && input.takeUntilBy;
}

function _isRxJSStream(input){
	return input && input.subscribe && input.subscribeOnNext;
}

module.exports = kefirCast;
