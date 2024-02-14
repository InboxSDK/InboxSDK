import * as Kefir from 'kefir';
import type GmailDriver from '../../gmail-driver';
import GmailComposeButtonView, {
  type ButtonViewOptions,
} from './gmail-compose-button-view';
import BasicButtonViewController from '../../../../widgets/buttons/basic-button-view-controller';
import DropdownButtonViewController from '../../../../widgets/buttons/dropdown-button-view-controller';
import GmailDropdownView from '../../widgets/gmail-dropdown-view';
import insertElementInOrder from '../../../../lib/dom/insert-element-in-order';
import type GmailComposeView from '../gmail-compose-view';
import { ComposeButtonDescriptor } from '../../../../driver-interfaces/compose-view-driver';
import { Options } from '../../../../views/compose-button-view';

export default function addButton(
  gmailComposeView: GmailComposeView,
  buttonDescriptorStream: Kefir.Observable<
    ComposeButtonDescriptor | null | undefined,
    unknown
  >,
  groupOrderHint: string,
  extraOnClickOptions: Record<string, any>,
) {
  return new Promise<Options | null>((resolve) => {
    let buttonViewController:
      | BasicButtonViewController
      | DropdownButtonViewController
      | undefined;
    buttonDescriptorStream
      .takeUntilBy(gmailComposeView.getStopper())
      .onValue((buttonDescriptor) => {
        const buttonOptions = _processButtonDescriptor(
          buttonDescriptor,
          extraOnClickOptions,
          gmailComposeView.getGmailDriver(),
        );

        if (
          buttonViewController instanceof DropdownButtonViewController &&
          buttonOptions?.hasDropdown !== true
        ) {
          buttonViewController.destroy();
          buttonViewController = undefined;
        }

        if (!buttonViewController) {
          if (buttonOptions) {
            buttonViewController = _addButton(
              gmailComposeView,
              buttonOptions,
              groupOrderHint,
            );
            resolve({
              buttonViewController: buttonViewController,
              buttonDescriptor: buttonDescriptor,
            });
          }
        } else {
          // This
          buttonViewController.update(buttonOptions as any);
        }
      })
      .onEnd(() => {
        // Just in case things end without ever resolving above.
        resolve(null);
      });
  });
}

function _addButton(
  gmailComposeView: GmailComposeView,
  buttonOptions: ComposeButtonDescriptor,
  groupOrderHint: string,
) {
  if (
    !gmailComposeView.getElement() ||
    !gmailComposeView.getFormattingToolbar()
  ) {
    return;
  }

  let buttonViewController;

  if (buttonOptions.type === 'MODIFIER') {
    buttonViewController = _addButtonToModifierArea(
      gmailComposeView,
      buttonOptions,
      groupOrderHint,
    );
  } else if (buttonOptions.type === 'SEND_ACTION') {
    buttonViewController = _addButtonToSendActionArea(
      gmailComposeView,
      buttonOptions,
    );
  }

  gmailComposeView.getElement().dispatchEvent(
    new CustomEvent('buttonAdded', {
      bubbles: false,
      cancelable: false,
      detail: null,
    }),
  );
  return buttonViewController;
}

function _addButtonToModifierArea(
  gmailComposeView: GmailComposeView,
  buttonDescriptor: Record<string, any>,
  groupOrderHint: string,
) {
  var buttonViewController = _getButtonViewController(buttonDescriptor);

  buttonViewController.getView().getElement().setAttribute('tabindex', '1');
  buttonViewController
    .getView()
    .getElement()
    .setAttribute('data-order-hint', String(buttonDescriptor.orderHint || 0));
  buttonViewController
    .getView()
    .getElement()
    .setAttribute('data-group-order-hint', groupOrderHint);

  var formattingAreaOffsetLeft =
    gmailComposeView._getFormattingAreaOffsetLeft();

  var element: HTMLElement = buttonViewController.getView().getElement();
  var actionToolbar: HTMLElement =
    gmailComposeView.getAdditionalActionToolbar();
  insertElementInOrder(actionToolbar, element);
  gmailComposeView.updateInsertMoreAreaLeft(formattingAreaOffsetLeft);
  gmailComposeView.addManagedViewController(buttonViewController);
  return buttonViewController;
}

function _addButtonToSendActionArea(
  gmailComposeView: GmailComposeView,
  buttonDescriptor: ComposeButtonDescriptor,
) {
  const buttonViewController = _getButtonViewController(buttonDescriptor);

  buttonViewController.getView().removeClass('inboxsdk__composeButton');
  buttonViewController.getView().addClass('inboxsdk__compose_sendButton');
  buttonViewController.getView().getElement().setAttribute('tabindex', '1');
  const sendButtonGroupElement = gmailComposeView.getSendButtonGroup();
  const buttonElement: HTMLElement = buttonViewController
    .getView()
    .getElement();
  const parent: HTMLElement = sendButtonGroupElement.parentElement as any;
  parent.insertBefore(buttonElement, sendButtonGroupElement.nextSibling);
  gmailComposeView.addManagedViewController(buttonViewController);
  return buttonViewController;
}

function _getButtonViewController(buttonDescriptor: ButtonViewOptions) {
  const buttonView = new GmailComposeButtonView(buttonDescriptor);
  const options = {
    buttonView,
    ...buttonDescriptor,
  };
  let buttonViewController;

  if (buttonDescriptor.hasDropdown) {
    Object.assign(options, {
      dropdownViewDriverClass: GmailDropdownView,
      dropdownPositionOptions: {
        vAlign: 'top',
      },
    });
    buttonViewController = new DropdownButtonViewController(options);
  } else {
    buttonViewController = new BasicButtonViewController(options);
  }

  return buttonViewController;
}

function _processButtonDescriptor(
  buttonDescriptor: ComposeButtonDescriptor | null | undefined,
  extraOnClickOptions: Record<string, any>,
  driver: GmailDriver,
) {
  // clone the descriptor and set defaults.
  if (!buttonDescriptor) {
    return null;
  }

  const buttonOptions: ComposeButtonDescriptor & {
    dropdownShowFunction?: ComposeButtonDescriptor['onClick'];
    activateFunction?: ComposeButtonDescriptor['onClick'];
    noArrow?: true;
  } = {
    type: 'MODIFIER',
    ...buttonDescriptor,
  };
  const oldOnClick = buttonOptions.onClick;

  buttonOptions.onClick = function (event) {
    driver.getLogger().eventSdkActive('composeView.addedButton.click');
    oldOnClick({ ...extraOnClickOptions, ...event });
  };

  if (buttonOptions.hasDropdown) {
    buttonOptions.dropdownShowFunction = buttonOptions.onClick;
  } else {
    buttonOptions.activateFunction = buttonOptions.onClick;
  }

  buttonOptions.noArrow = true;
  buttonOptions.tooltip = buttonOptions.tooltip || buttonOptions.title;
  delete buttonOptions.title;

  if (buttonOptions.type === 'MODIFIER') {
    buttonOptions.buttonColor = 'flatIcon';
  } else if (buttonOptions.type === 'SEND_ACTION') {
    buttonOptions.buttonColor = 'blue';
  }

  return buttonOptions;
}
