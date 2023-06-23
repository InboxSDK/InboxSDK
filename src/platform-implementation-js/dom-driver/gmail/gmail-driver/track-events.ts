import Kefir from 'kefir';
import makeElementChildStream from '../../../lib/dom/make-element-child-stream';
import type GmailDriver from '../gmail-driver';
import GmailComposeView from '../views/gmail-compose-view';

export default function trackEvents(gmailDriver: GmailDriver) {
  _setupComposeMonitoring(gmailDriver);
  _setupAttachmentModalMonitoring(gmailDriver);
  _setupDragDropMonitoring(gmailDriver);
}

function _setupComposeMonitoring(gmailDriver: GmailDriver) {
  gmailDriver.getComposeViewDriverStream().onValue((composeViewDriver) => {
    var logFunction = _getLogFunction(gmailDriver, composeViewDriver);
    logFunction('compose open');

    _monitorComposeSpecificEvents(composeViewDriver, logFunction);
  });
}

function _getLogFunction(
  gmailDriver: GmailDriver,
  composeViewDriver: GmailComposeView
) {
  var logger = gmailDriver.getLogger();
  var composeStats = {
    isInlineReply: composeViewDriver.isInlineReplyForm(),
    isReply: composeViewDriver.isReply(),
  };

  return function (eventName: string, extraOptions?: any) {
    logger.eventSite(eventName, { ...composeStats, ...extraOptions });
  };
}

type LogFunction = (eventName: string, extraOptions?: any) => void;

function _monitorComposeSpecificEvents(
  composeViewDriver: GmailComposeView,
  logFunction: LogFunction
) {
  _monitorAttachmentButton(composeViewDriver, logFunction);
  _monitorDriveButton(composeViewDriver, logFunction);
}

function _monitorAttachmentButton(
  composeViewDriver: GmailComposeView,
  logFunction: LogFunction
) {
  var attachmentButton = composeViewDriver.getElement().querySelector('.a1');
  if (attachmentButton) {
    Kefir.fromEvents(attachmentButton, 'mousedown')
      .takeUntilBy(composeViewDriver.getStopper())
      .onValue(() => {
        logFunction('attachment button clicked');
        _monitorAttachmentAdded(composeViewDriver, logFunction);
      });
  }
}

function _monitorAttachmentAdded(
  composeViewDriver: GmailComposeView,
  logFunction: LogFunction
) {
  makeElementChildStream(document.body)
    .map((event) => event.el)
    .filter((node) => node && (node as any).type === 'file')
    .take(1)
    .flatMap((node) => {
      return Kefir.fromEvents(node, 'change')
        .map(() => true)
        .merge(
          Kefir.fromEvents(composeViewDriver.getBodyElement(), 'focus')
            .map(() => false)
            .delay(1000)
        );
    })
    .take(1)
    .filter(Boolean)
    .takeUntilBy(composeViewDriver.getStopper())
    .onValue(() => logFunction('attachment uploaded'));
}

function _monitorDriveButton(
  composeViewDriver: GmailComposeView,
  logFunction: LogFunction
) {
  var driveButton = composeViewDriver.getElement().querySelector('.aA7');
  if (driveButton) {
    Kefir.fromEvents(driveButton, 'mousedown')
      .takeUntilBy(composeViewDriver.getStopper())
      .onValue(() => {
        logFunction('drive button clicked');
        _monitorDriveFileAdded(composeViewDriver, logFunction);
      });
  }
}

function _monitorDriveFileAdded(
  composeViewDriver: GmailComposeView,
  logFunction: LogFunction
) {
  var numberCurrentDriveChips = composeViewDriver
    .getBodyElement()
    .querySelectorAll('.gmail_drive_chip').length;

  makeElementChildStream(document.body)
    .map((event) => event.el)
    .filter((node) => node && node.classList.contains('picker-dialog'))
    .take(1)
    .flatMap((_node) => {
      return Kefir.fromEvents(composeViewDriver.getBodyElement(), 'focus')
        .delay(1000)
        .map(() => {
          if (composeViewDriver.getBodyElement()) {
            return composeViewDriver
              .getBodyElement()
              .querySelectorAll('.gmail_drive_chip').length;
          }

          return 0;
        })
        .map((newNumber) => numberCurrentDriveChips < newNumber)
        .take(1);
    })
    .take(1)
    .filter(Boolean)
    .takeUntilBy(composeViewDriver.getStopper())
    .onValue(() => logFunction('drive file added'));
}

function _setupAttachmentModalMonitoring(gmailDriver: GmailDriver) {
  makeElementChildStream(document.body)
    .map((event) => event.el)
    .filter(
      (node) => node.getAttribute && node.getAttribute('role') === 'alertdialog'
    )
    .takeUntilBy(gmailDriver.getStopper())
    .onValue((node) => {
      var heading = node.querySelector('[role=heading]');
      if (heading) {
        if (heading.textContent!.indexOf('exceeds the 25MB') > -1) {
          gmailDriver.getLogger().eventSite('large attachment suggest drive');
          return;
        }
      }

      var body = node.querySelector('.Kj-JD-Jz');
      if (body) {
        if (body.textContent!.indexOf('exceeds the maximum') > -1) {
          gmailDriver
            .getLogger()
            .eventSite('large attachment from drag and drop');
          return;
        }
      }
    });
}

function _setupDragDropMonitoring(gmailDriver: GmailDriver) {
  gmailDriver
    .getComposeViewDriverStream()
    .flatMapLatest(() => {
      return Kefir.fromEvents<any, unknown>(document.body, 'dragenter')
        .filter((event) => event.toElement) // ignore events caused by dragFilesIntoCompose
        .filter(
          (event) =>
            event.toElement.classList.contains('aC7') ||
            event.toElement.classList.contains('aC9')
        )
        .take(1);
    })
    .takeUntilBy(gmailDriver.getStopper())
    .onValue(() => gmailDriver.getLogger().eventSite('compose drag file'));

  gmailDriver
    .getComposeViewDriverStream()
    .flatMapLatest(() => {
      return Kefir.fromEvents<any, unknown>(document.body, 'drop')
        .filter((event) => event.toElement)
        .filter(
          (event) =>
            event.toElement.classList.contains('aC7') ||
            event.toElement.classList.contains('aC9')
        )
        .take(1);
    })
    .takeUntilBy(gmailDriver.getStopper())
    .onValue(() => gmailDriver.getLogger().eventSite('compose drop file'));
}
