import find from 'lodash/find';
import * as Kefir from 'kefir';
import kefirStopper from 'kefir-stopper';
import autoHtml from 'auto-html';
import type GmailDriver from '../gmail-driver';
import type GmailMessageView from './gmail-message-view';
import fromEventTargetCapture from '../../../lib/from-event-target-capture';
import querySelector from '../../../lib/dom/querySelectorOrFail';
import ButtonView from '../widgets/buttons/button-view';
import BasicButtonViewController from '../../../widgets/buttons/basic-button-view-controller';
import { simulateClick } from '../../../lib/dom/simulate-mouse-event';
import waitFor from '../../../lib/wait-for';

class GmailAttachmentCardView {
  _element!: HTMLElement;
  _driver: GmailDriver;
  _messageViewDriver: GmailMessageView | null | undefined;
  _cachedType: any;
  _stopper: Kefir.Observable<null, unknown> & {
    destroy(): void;
  } = kefirStopper();
  _previewClicks = Kefir.pool<Event, unknown>();

  constructor(
    options: Record<string, any>,
    driver: GmailDriver,
    messageViewDriver?: GmailMessageView | null
  ) {
    this._driver = driver;
    this._messageViewDriver = messageViewDriver;

    if (options.element) {
      this._element = options.element;
    } else {
      this._createNewElement(options);
    }
  }

  destroy() {
    this._stopper.destroy();
  }

  getElement(): HTMLElement {
    return this._element;
  }

  getMessageViewDriver() {
    return this._messageViewDriver;
  }

  getStopper() {
    return this._stopper;
  }

  getPreviewClicks() {
    return this._previewClicks.takeUntilBy(this._stopper);
  }

  _isStandardAttachment(): boolean {
    return this.getAttachmentType() === 'FILE';
  }

  getAttachmentType(): string {
    if (this._cachedType) {
      return this._cachedType;
    }

    const type = this._readAttachmentType();

    if (type !== 'UNLOADED') {
      this._cachedType = type;
    }

    return type;
  }

  _readAttachmentType(): string {
    if (this._element.classList.contains('inboxsdk__attachmentCard')) {
      return 'CUSTOM';
    }

    // FILE attachment cards are never in unloaded state.
    if (
      this._element.children.length === 1 &&
      this._element.children[0].children.length === 0
    ) {
      return 'UNLOADED';
    }

    const link = this._getDownloadLink();

    if (!link || link.match(/^https?:\/\/mail\.google\.com\//)) {
      // Only files and unloaded ever lack a link.
      return 'FILE';
    }

    if (link.match(/^https?:\/\/([^/]*\.)?google(usercontent)?\.com\//)) {
      return 'DRIVE';
    }

    return 'UNKNOWN';
  }

  addButton(options: Record<string, any>) {
    var buttonView = new ButtonView({
      iconUrl: options.iconUrl,
      tooltip: options.tooltip,
    });

    this._addButton(buttonView);
  }

  getTitle(): string {
    const title = this._element.querySelector('span .aV3');

    return title ? title.textContent! : '';
  }

  _getDownloadLink(): string | null | undefined {
    const firstChild: HTMLAnchorElement | null | undefined = this._element
      .firstElementChild as any;
    if (!firstChild) throw new Error('Failed to find link');

    if (firstChild.tagName !== 'A' || !firstChild.href) {
      const download_url = this._element.getAttribute('download_url');

      if (download_url) {
        const m = /:(https:\/\/[^:]+)/.exec(download_url);
        return m ? m[1] : null;
      }
    } else {
      const firstChildHref = firstChild.href;

      if (firstChildHref) {
        return firstChildHref.replace(
          /([?&])disp=inline(?=&|$)/,
          '$1disp=safe'
        );
      }

      return firstChildHref;
    }
  }

  // Resolves the short-lived cookie-less download URL
  async getDownloadURL(): Promise<string | null | undefined> {
    try {
      if (this._isStandardAttachment()) {
        const downloadUrl = await waitFor(() => this._getDownloadLink());
        if (!downloadUrl) return null;
        const finalUrl: string = await this._driver.resolveUrlRedirects(
          downloadUrl
        );

        if (
          !/^https:\/\/mail-attachment\.googleusercontent\.com\/attachment\//.test(
            finalUrl
          )
        ) {
          console.error('getDownloadURL returned unexpected url', finalUrl);
          const err = new Error('getDownloadURL returned unexpected url');

          this._driver.getLogger().error(err, {
            finalUrlCensored: finalUrl.replace(/\?[^/]+$/, '?[...]'),
          });

          if (/^https:\/\/mail\.google\.com\//.test(finalUrl)) {
            // This URL definitely isn't right: these URLs generally require
            // authentication and shouldn't be returned by getDownloadURL.
            throw err;
          } // Otherwise, don't throw; only log. Maybe Gmail has changed the URL
          // structure and things will just work.
        }

        return finalUrl;
      } else {
        const downloadButton = this._element.querySelector(
          '[data-inboxsdk-download-url]'
        );

        return downloadButton
          ? downloadButton.getAttribute('data-inboxsdk-download-url')
          : null;
      }
    } catch (err) {
      this._driver.getLogger().error(err);

      throw err;
    }
  }

  _extractFileNameFromElement(): string {
    return querySelector(this._element, '.aQA > span').textContent!;
  }

  _createNewElement(options: Record<string, any>) {
    this._element = document.createElement('span');

    this._element.classList.add('aZo');

    this._element.classList.add('inboxsdk__attachmentCard');

    var htmlArray = [
      autoHtml`
			<a target="_blank" role="link" class="aQy e" href="">
				<div aria-hidden="true">
					<div class="aSG"></div>
					<div class="aVY aZn">
						<div class="aZm"></div>
					</div>
					<div class="aSH">`,
    ];

    if (options.iconThumbnailUrl) {
      htmlArray = htmlArray.concat([
        autoHtml`
				<div class="aYv">
					<img class="aZG aYw" src="${options.iconThumbnailUrl}">
				</div>`,
      ]);
    } else {
      htmlArray = htmlArray.concat([
        autoHtml`
				<img class="aQG aYB inboxsdk__attachmentCard_previewThumbnailUrl"
					src="${options.previewThumbnailUrl}">`,
      ]);
    }

    htmlArray = htmlArray.concat([
      autoHtml`
			<div class="aYy">
				<div class="aYA">
					<img class="aSM" src="${options.fileIconImageUrl}">
				</div>
				<div class="aYz">
					<div class="a12">
						<div class="aQA">
							<span class="aV3 a6U"></span>
						</div>
						<div class="aYp">
							<span class="SaH2Ve"></span>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="aSI">
			<div class="aSJ"></div>
		</div>
	</div>
</a>
<div class="aQw"></div>`,
    ]);
    this._element.innerHTML = htmlArray.join('');
    (this._element.children[0] as any).href = options.previewUrl;

    if (options.mimeType && options.mimeType.split('/')[0] === 'image') {
      this._element.children[0].classList.add('aZI');
    }

    querySelector(this._element, 'span .aV3').textContent = options.title;
    querySelector(this._element, 'div.aYp > span').textContent =
      options.description || '';
    querySelector(this._element, 'div.aSJ').style.borderColor =
      options.foldColor;

    this._addHoverEvents();

    if (options.buttons) {
      const downloadButton = find(options.buttons, function (button) {
        return button.downloadUrl;
      });

      if (downloadButton) {
        this._addDownloadButton(downloadButton);
      }

      this._addMoreButtons(options.buttons);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    var self = this;

    this._previewClicks.plug(
      Kefir.fromEvents<MouseEvent, unknown>(this._element, 'click').map(
        (event) => ({
          preventDefault: () => event.preventDefault(),
        })
      ) as any
    );

    if (options.previewThumbnailUrl && options.failoverPreviewIconUrl) {
      const previewThumbnailUrlImage = querySelector(
        this._element,
        '.inboxsdk__attachmentCard_previewThumbnailUrl'
      );

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      previewThumbnailUrlImage.onerror = (e) => {
        var iconDiv = document.createElement('div');
        iconDiv.classList.add('aYv');
        iconDiv.innerHTML =
          '<img class="aZG aYw" src="' + options.failoverPreviewIconUrl + '">';
        const parent = previewThumbnailUrlImage.parentElement;
        if (!parent) throw new Error('Could not find parent element');
        parent.insertBefore(
          iconDiv,
          previewThumbnailUrlImage.nextElementSibling
        );
        previewThumbnailUrlImage.remove();
      };
    }
  }

  _addHoverEvents() {
    Kefir.merge([
      Kefir.fromEvents(this._element, 'mouseenter'),
      fromEventTargetCapture(this._element, 'focus'),
    ]).onValue(() => {
      this._element.classList.add('aZp');
    });
    Kefir.merge([
      Kefir.fromEvents(this._element, 'mouseleave'),
      fromEventTargetCapture(this._element, 'blur'),
    ]).onValue(() => {
      this._element.classList.remove('aZp');
    });
    const anchor = querySelector(this._element, 'a');
    Kefir.fromEvents(anchor, 'focus').onValue(() => {
      anchor.classList.add('a1U');
    });
    Kefir.fromEvents(anchor, 'blur').onValue(() => {
      anchor.classList.remove('a1U');
    });
  }

  _addDownloadButton(options: Record<string, any>) {
    const buttonView = new ButtonView({
      tooltip: 'Download',
      iconClass: 'aSK J-J5-Ji aYr',
    });
    buttonView
      .getElement()
      .setAttribute('data-inboxsdk-download-url', options.downloadUrl);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const basicButtonViewController = new BasicButtonViewController({
      activateFunction: function () {
        let prevented = false;

        if (options.onClick) {
          options.onClick({
            preventDefault: function () {
              prevented = true;
            },
          });
        }

        if (prevented) {
          return;
        }

        const downloadLink = document.createElement('a');
        downloadLink.href = options.downloadUrl;

        if (options.downloadFilename) {
          downloadLink.download = options.downloadFilename;
        }

        downloadLink.addEventListener(
          'click',
          function (e: MouseEvent) {
            e.stopPropagation();
          },
          true
        );

        if (options.openInNewTab) {
          downloadLink.setAttribute('target', '_blank');
        }

        document.body.appendChild(downloadLink);
        simulateClick(downloadLink);
        downloadLink.remove();
      },
      buttonView: buttonView,
    });

    this._addButton(buttonView);
  }

  _addMoreButtons(buttonDescriptors: Record<string, any>[] | null | undefined) {
    (buttonDescriptors || [])
      .filter(function (buttonDescriptor) {
        return !buttonDescriptor.downloadUrl;
      })
      .forEach((desc) => {
        this.addButton(desc);
      });
  }

  _addButton(buttonView: ButtonView) {
    buttonView.addClass('aQv');

    this._getButtonContainerElement().appendChild(buttonView.getElement());
  }

  _getPreviewImageUrl(): string | null | undefined {
    var previewImage = this._getPreviewImage();

    if (!previewImage) {
      return null;
    }

    return previewImage.src;
  }

  _getPreviewImage(): HTMLImageElement {
    return this._element.querySelector('img.aQG') as any;
  }

  _getButtonContainerElement(): HTMLElement {
    return querySelector(this._element, '.aQw');
  }
}

export default GmailAttachmentCardView;
