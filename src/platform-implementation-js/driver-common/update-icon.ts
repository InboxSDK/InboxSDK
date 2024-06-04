export interface IconSettings {
  iconElement?: HTMLElement | null;
  iconHtmlElement?: HTMLElement | null;
  iconImgElement?: HTMLElement | null;
}

function createIconElement(
  containerElement: HTMLElement,
  append: boolean,
  insertBeforeEl: HTMLElement | null | undefined,
) {
  const iconElement = document.createElement('div');
  iconElement.classList.add('inboxsdk__button_icon');
  iconElement.innerHTML = '&nbsp;';

  if (append) {
    containerElement.appendChild(iconElement);
  } else {
    containerElement.insertBefore(
      iconElement,
      insertBeforeEl || (containerElement as any).firstElementChild,
    );
  }

  return iconElement;
}

function createIconImgElement(
  iconUrl: string,
  containerElement: HTMLElement,
  append: boolean,
  insertBeforeEl: HTMLElement | null | undefined,
) {
  const iconElement = createIconElement(
    containerElement,
    append,
    insertBeforeEl,
  );
  iconElement.innerHTML = '';
  const iconImgElement = document.createElement('img');
  iconImgElement.classList.add('inboxsdk__button_iconImg');

  iconImgElement.src = iconUrl;
  iconElement.appendChild(iconImgElement);

  return iconElement;
}

// TODO make this return a class instead of taking the iconSettings state object
export default function updateIcon(
  iconSettings: IconSettings,
  containerElement: HTMLElement,
  append: boolean,
  newIconClass: string | null | undefined,
  newIconUrl: string | null | undefined,
  insertBeforeEl?: HTMLElement | null | undefined, // Should not be used with append: true — the append flag will override
  newIconHtml?: string,
  iconLiga?: string,
) {
  if (append && insertBeforeEl)
    throw new Error('append and insertBeforeEl should not be used together');

  // if iconHtml exists, class or url presents just throw error
  if (newIconHtml && (newIconClass || newIconUrl)) {
    throw new Error(
      'iconHtml can not be used together with iconClass or iconUrl',
    );
  }

  if (newIconHtml) {
    if (!iconSettings.iconHtmlElement) {
      iconSettings.iconHtmlElement = createIconElement(
        containerElement,
        append,
        insertBeforeEl,
      );
    }

    iconSettings.iconHtmlElement.innerHTML = newIconHtml;

    if (iconSettings.iconImgElement) {
      iconSettings.iconImgElement.remove();
      iconSettings.iconImgElement = null;
    }

    if (iconSettings.iconElement) {
      iconSettings.iconElement.remove();
      iconSettings.iconElement = null;
    }
  } else if (newIconUrl) {
    if (!iconSettings.iconImgElement) {
      iconSettings.iconImgElement = createIconImgElement(
        newIconUrl,
        containerElement,
        append,
        insertBeforeEl,
      );
    } else {
      (
        iconSettings.iconImgElement!.firstElementChild! as HTMLImageElement
      ).src = newIconUrl;
    }

    iconSettings.iconImgElement.setAttribute(
      'class',
      `inboxsdk__button_icon ${newIconClass || ''}`,
    );

    if (iconSettings.iconHtmlElement) {
      iconSettings.iconHtmlElement.remove();
      iconSettings.iconHtmlElement = null;
    }

    if (iconSettings.iconElement) {
      iconSettings.iconElement.remove();
      iconSettings.iconElement = null;
    }
  } else if (newIconClass) {
    if (!iconSettings.iconElement) {
      iconSettings.iconElement = createIconElement(
        containerElement,
        append,
        insertBeforeEl,
      );
    }

    if (iconLiga) {
      iconSettings.iconElement.innerText = iconLiga;
    }

    iconSettings.iconElement.setAttribute(
      'class',
      'inboxsdk__button_icon ' + newIconClass,
    );

    if (iconSettings.iconHtmlElement) {
      iconSettings.iconHtmlElement.remove();
      iconSettings.iconHtmlElement = null;
    }

    if (iconSettings.iconImgElement) {
      iconSettings.iconImgElement.remove();
      iconSettings.iconImgElement = null;
    }
  } else {
    if (iconSettings.iconElement) {
      iconSettings.iconElement.remove();
      iconSettings.iconElement = null;
    }

    if (iconSettings.iconHtmlElement) {
      iconSettings.iconHtmlElement.remove();
      iconSettings.iconHtmlElement = null;
    }

    if (iconSettings.iconImgElement) {
      iconSettings.iconImgElement.remove();
      iconSettings.iconImgElement = null;
    }
  }
}
