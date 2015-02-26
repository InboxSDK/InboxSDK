export default function* getPrototypeChain(obj) {
  let currentProto = obj;
  while ((currentProto = Object.getPrototypeOf(currentProto))) {
    yield currentProto;
  }
}
