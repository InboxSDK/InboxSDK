declare global {
  var SDK_VERSION:
    | `${number}.${number}.${number}-${number}-${string}${'' | '-MODIFIED'}${
        | ''
        | '-WATCH'}`
    | undefined;
}

const enum DATA_ATTR {
  SDK_VERSION = 'data-inboxsdk-version',
  CONTENT_HASH = 'data-inboxsdk-contenthash',
}

/**
 * Insert the SDK's CSS deterministically into the DOM.
 * Older versions of the SDK have their CSS inserted
 * prior to newer versions. Older SDKs, published prior
 * to this ordering change, have undefined behavior around insertion.
 *
 * @note This function is inlined by style-loader. Because of this, it can't refer to outside runtime code or constants.
 */
export function styleTagTransform(css: string, htmlElement: HTMLStyleElement) {
  /** Used as ID until @inboxsdk/core@1.0.4 */
  const CLASS_NAME = 'inboxsdk__style' as const;

  function extractPublishTime(version: string | undefined) {
    const epochTimestamp = version?.split('-')[1];

    if (!epochTimestamp) {
      return new Date(0);
    }

    return new Date(parseInt(epochTimestamp));
  }

  /**
   * TS adaptation of https://stackoverflow.com/a/34842797
   */
  const hashCode = (s: string) =>
    Array.from(s).reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);

  /** Pre @inboxsdk/core@1.0.4 style tag selector */
  const legacyIdStyleTag = document.getElementById(CLASS_NAME);

  htmlElement.innerHTML = css;

  // Our old logic before April 2023 was to not insert the CSS if the there was an existing #inboxsdk__style element.
  if (!SDK_VERSION) {
    if (!legacyIdStyleTag) {
      htmlElement.id = CLASS_NAME;
      if (!document.head) throw new Error('missing head');
      document.head.appendChild(htmlElement);
    }

    return;
  }

  /**
   * There may be more than one CSS file inserted by style loader.
   * This hashing allows us to check quickly if the current SDK version has already added the corresponding stylesheet.
   * If there are two versions of the SDK with the same CSS file, both are inserted with the latest version occurring latest.
   */
  const contentHash = hashCode(css);

  const maybeExistingStyle = document.querySelector(
    `style.${CLASS_NAME}[${DATA_ATTR.SDK_VERSION}="` +
      SDK_VERSION +
      `"][${DATA_ATTR.CONTENT_HASH}="${contentHash}"]`
  );

  if (maybeExistingStyle) {
    return;
  }

  const currentSdkStyleVersions = Array.from(
    document.querySelectorAll<HTMLStyleElement>(
      `style.${CLASS_NAME}[data-inboxsdk-version]`
    )
  ).sort((a, b) => {
    // sort by publish time
    const aDate = extractPublishTime(a.dataset.inboxsdkVersion);
    const bDate = extractPublishTime(b.dataset.inboxsdkVersion);

    return aDate.getTime() - bDate.getTime();
  });

  const versionDate = extractPublishTime(SDK_VERSION);

  htmlElement.className = CLASS_NAME;
  htmlElement.setAttribute(DATA_ATTR.CONTENT_HASH, contentHash.toString());

  htmlElement.setAttribute(DATA_ATTR.SDK_VERSION, SDK_VERSION);

  const newerExistingStyleTag = !versionDate
    ? null
    : currentSdkStyleVersions.find((node) => {
        if (node.dataset.inboxsdkVersion) {
          return extractPublishTime(node.dataset.inboxsdkVersion) > versionDate;
        }

        return false;
      });

  if (newerExistingStyleTag) {
    newerExistingStyleTag.parentElement!.insertBefore(
      htmlElement,
      newerExistingStyleTag
    );
  } else if (legacyIdStyleTag) {
    legacyIdStyleTag.parentElement!.appendChild(htmlElement);
  } else {
    document.head.appendChild(htmlElement);
  }
}
