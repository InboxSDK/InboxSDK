/* @flow */

export default function* getPrototypeChain(obj: Object): Generator<Object,void,void> {
  let currentProto = obj;
  while ((currentProto = Object.getPrototypeOf(currentProto))) {
    yield currentProto;
  }
}
