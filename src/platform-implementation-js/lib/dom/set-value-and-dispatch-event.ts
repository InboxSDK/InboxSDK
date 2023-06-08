export default function setValueAndDispatchInputEvent(
  element: HTMLElement,
  value: string,
  eventName: string
) {
  (element as any).value = value;
  const event = document.createEvent('Event');
  (event as any).initEvent(eventName);
  element.dispatchEvent(event);
}
