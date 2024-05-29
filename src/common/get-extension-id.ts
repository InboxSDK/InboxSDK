export default function getExtensionId(): string | null {
  const chrome: any = (global as any).chrome;
  if (chrome?.runtime?.getURL) {
    return chrome.runtime.getURL('');
  }
  if (chrome?.extension?.getURL) {
    return chrome.extension.getURL('');
  }
  return null;
}
