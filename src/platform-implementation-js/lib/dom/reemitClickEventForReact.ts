export default function reemitClickEvent(event: MouseEvent) {
  // Inbox is going to block this event from bubbling to the body. We
  // want to manually dispatch an event that looks like it so that if
  // the extension is using React (which listens to events on the body)
  // then React will see it.
  const fakeEvent = new MouseEvent('click');
  Object.defineProperties(fakeEvent, {
    target: { value: event.target },
    detail: { value: event.detail },
    screenX: { value: event.screenX },
    screenY: { value: event.screenY },
    clientX: { value: event.clientX },
    clientY: { value: event.clientY },
    button: { value: event.button },
    buttons: { value: event.buttons },
    ctrlKey: { value: event.ctrlKey },
    shiftKey: { value: event.shiftKey },
    altKey: { value: event.altKey },
    metaKey: { value: event.metaKey }
  });
  document.dispatchEvent(fakeEvent);
}
