/* @flow */

const UIEvent = global.UIEvent;

// Throws an error if this is called outside of dispatch of a UIEvent.
// This is intended to emulate a window.open-like restriction, to allow a
// function to only be called in response to a user action.
export default function checkInUserInputEvent() {
  if (!isInUserInputEvent()) {
    throw new Error('This function is restricted so it may only be called during a user input event.');
  }
}

function isInUserInputEvent(): boolean {
  const event = global.event;
  if (!event) return false;
  if (!(event instanceof UIEvent)) return false;
  return event.isTrusted && event.eventPhase != 0;
}
