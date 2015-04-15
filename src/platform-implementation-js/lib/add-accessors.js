import _ from 'lodash';

export const getGetterName = _.memoize(variableName =>
  'get' + variableName.charAt(1).toUpperCase() + variableName.slice(2)
);

export const getSetterName = _.memoize(variableName =>
  'set' + variableName.charAt(1).toUpperCase() + variableName.slice(2)
);

export const makeGetter = _.memoize(variableName =>
  function() {
    return this[variableName];
  }
);

export const makeSetter = _.memoize(variableName =>
  function(x) {
    this[variableName] = x;
  }
);

const SUPPORTED_DESCRIPTOR_PROPS = [
  'name', 'get', 'set', 'destroy', 'destroyMethod'
];

export default function addAccessors(obj, descriptors) {
  descriptors = Array.from(descriptors);
  descriptors.forEach(descriptor => {
    const {name} = descriptor;
    if (process.env.NODE_ENV !== 'production') {
      const unsupportedProps = _.difference(
        Object.keys(descriptor), SUPPORTED_DESCRIPTOR_PROPS);
      if (unsupportedProps.length) {
        throw new Error("Unsupported accessor descriptor properties: " +
          unsupportedProps.join(', '));
      }
    }
    if (descriptor.get) {
      obj[getGetterName(name)] = makeGetter(name);
    }
    if (descriptor.set) {
      obj[getSetterName(name)] = makeSetter(name);
    }
  });
  const superDestroy = obj.destroy;
  obj.destroy = function() {
    this.DEBUG_LAST_DESTROY = [];
    descriptors.forEach(descriptor => {
      const {name, destroy} = descriptor;
      this.DEBUG_LAST_DESTROY.push(['considering', name, destroy]);
      if (_.has(this, name)) {
        this.DEBUG_LAST_DESTROY.push(['has']);
        if (destroy && this[name]) {
          const destroyMethod = descriptor.destroyMethod || 'destroy';
          this.DEBUG_LAST_DESTROY.push(['destroy and present']);
          if (Array.isArray(this[name])) {
            this.DEBUG_LAST_DESTROY.push(['is array']);
            this[name].forEach(x => {
              x[destroyMethod]();
            });
          } else {
            this.DEBUG_LAST_DESTROY.push(['not array']);
            this[name][destroyMethod]();
          }
        }
        this.DEBUG_LAST_DESTROY.push(['setting to undefined']);
        this[name] = undefined;
      }
    });
    if (superDestroy) {
      superDestroy.call(this);
    }
    this.DEBUG_LAST_DESTROY.push(['done']);
  };
  obj.destroy.DEBUG_descriptors = descriptors;
}
