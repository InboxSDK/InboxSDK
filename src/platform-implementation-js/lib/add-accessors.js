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
    descriptors.forEach(descriptor => {
      const {name, destroy} = descriptor;
      if (_.has(this, name)) {
        if (destroy && this[name]) {
          const destroyMethod = descriptor.destroyMethod || 'destroy';
          if (Array.isArray(this[name])) {
            this[name].forEach(x => {
              x[destroyMethod]();
            });
          } else {
            this[name][destroyMethod]();
          }
        }
        this[name] = undefined;
      }
    });
    if (superDestroy) {
      superDestroy.call(this);
    }
  };
  obj.destroy.DEBUG_descriptors = descriptors;
}
