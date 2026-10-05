import type EventEmitter from 'events';
import type {
  ComposeViewButtonOnClickEvent,
  ContactNameOptional,
} from '../../inboxsdk';
import type {
  AddressChangeEventName,
  RecipientsChangedEvent,
} from '../dom-driver/gmail/views/gmail-compose-view/get-address-changes-stream';
export { type ComposeViewDriver } from '../dom-driver/gmail/views/gmail-compose-view';

export type ComposeNotice = EventEmitter & {
  destroy(): void;
  destroyed: boolean;
  el: HTMLElement;
};
export type StatusBar = EventEmitter & {
  destroy(): void;
  destroyed: boolean;
  el: HTMLElement;
  setHeight(height: number): void;
};

/**
 * This type is passed into the  ComposeViewDriver#addButton method as a way to configure the button shown.
 */
export interface ComposeButtonDescriptor {
  title?: string;
  iconUrl?: string;
  iconClass?: string;
  onClick(event: ComposeViewButtonOnClickEvent): void;
  hasDropdown?: boolean;
  type?: 'SEND_ACTION' | 'MODIFIER';
  orderHint?: number;
  enabled?: boolean;
  noOverflow?: boolean;
  tooltip?: string;
  /** @deprecated Is this still used? */
  buttonColor?: string;
}

export type ComposeViewDriverEvent =
  | {
      eventName:
        | 'buttonAdded'
        | 'bodyChanged'
        | 'discardCanceled'
        | 'draftSaved'
        | 'minimized'
        | 'resize'
        | 'restored'
        | 'scheduled'
        | 'scheduling'
        | 'sendCanceled'
        | 'sending'
        | 'sent'
        | 'subjectChanged';
      // Added to appease tsc where `unknown` or omitting `data` causes errors
      data?: any;
    }
  | {
      eventName: 'destroy';
      data: {
        messageID: string | null | undefined;
        closedByInboxSDK: boolean;
      };
    }
  | {
      eventName: 'recipientsChanged';
      data: RecipientsChangedEvent;
    }
  | {
      eventName: 'fullscreenChanged';
      data: {
        fullscreen: boolean;
      };
    }
  | {
      eventName: 'responseTypeChanged';
      data: {
        isForward: boolean;
      };
    }
  | {
      eventName: 'presending';
      data: {
        cancel(): void;
      };
    }
  | {
      eventName: 'scheduleSendMenuOpening';
      data: {
        cancel(): void;
      };
    }
  | {
      eventName: 'scheduleSendMenuOpenCanceled';
      data?: undefined;
    }
  | {
      eventName: 'sent';
      data: {
        getMessageID(): Promise<string>;
        getThreadID(): Promise<string>;
      };
    }
  | {
      eventName: 'scheduled';
      data: {
        getMessageID(): Promise<string>;
        getThreadID(): Promise<string>;
      };
    }
  | {
      eventName: 'discard';
      data: {
        cancel(): void;
      };
    }
  | {
      eventName: 'messageIDChange';
      data: string | null | undefined;
    }
  | {
      eventName: AddressChangeEventName;
      data: {
        contact: ContactNameOptional;
      };
    };
