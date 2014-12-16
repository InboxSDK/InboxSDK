var Bacon = require('baconjs');

// Bacon doesn't support stream instances from different instances of the
// library directly interacting. This function converts a foreign Bacon stream
// into a native Bacon stream. It also converts non-streams into a stream that
// emits a single value.
function convertForeignInputToBacon(input) {
  if (input && input.subscribe) {
    return Bacon.fromBinder(function(sink) {
      return input.subscribe(function(event) {
        if (event.isNext()) {
          sink(new Bacon.Next(event.value.bind(event)));
        } else if (event.isEnd()) {
          sink(new Bacon.End());
        } else if (event.isInitial()) {
          sink(new Bacon.Initial(event.value.bind(event)));
        } else if (event.isError()) {
          sink(new Bacon.Error(event.error));
        } else {
          console.error("Unknown type of Bacon event", event);
        }
      });
    });
  } else {
    return Bacon.once(input);
  }
}

module.exports = convertForeignInputToBacon;
