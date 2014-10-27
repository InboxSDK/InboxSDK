function ElementObserver(name) {
  this._name = name;
}

ElementObserver.prototype.hello = function() {
  console.log('element observer says hello to '+this._name);
};

module.exports = ElementObserver;
