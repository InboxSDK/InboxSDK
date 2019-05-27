export default function getExtensionId(): string | null {
  const chrome: any = (global as any).chrome;
  if (chrome && chrome.extension && chrome.extension.getURL) {
    return chrome.extension.getURL('');
  }
  return null;
}
