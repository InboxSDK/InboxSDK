interface RelayProps {
  type: string;
  bubbles: boolean;
  cancelable: boolean;
  props?: any;
  dataTransfer?: {
    files: Blob[];
  } | null;
}

export default async function triggerRelayEvent(
  element: HTMLElement,
  detail: RelayProps
): Promise<void> {
  element.dispatchEvent(
    new CustomEvent('inboxsdk_event_relay', {
      bubbles: true,
      cancelable: false,
      detail
    })
  );
}
