// a wrapper around console.warn that makes sure not to repeat itself.
const pastWarnings = new Set();

export default function depWarn(...args) {
  const str = args.join();
  if (!pastWarnings.has(str)) {
    pastWarnings.add(str);
    console.warn('InboxSDK:', ...args);
  }
}
