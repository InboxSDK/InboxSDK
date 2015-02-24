function kefirCast(kefir, input){

	if(input && input.subscribe && input.onValue){
		return kefir.fromBinder(function(emitter){
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
	else{
		return kefir.constant(input);
	}

}

module.exports = kefirCast;
