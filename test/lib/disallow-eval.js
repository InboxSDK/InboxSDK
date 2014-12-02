function disallowEval() {
  // jshint evil:true
  var _eval = eval, _Function = Function;
  before(function() {
    global.eval = global.Function = function() {
      throw new Error("eval not allowed in this test");
    };
  });
  after(function() {
    global.eval = _eval;
    global.Function = _Function;
  });
}

module.exports = disallowEval;
