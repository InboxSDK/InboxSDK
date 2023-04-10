// This is in its own file so that updates to the version value don't cause a
// reload of everything.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- SDK_VERSION is injected by webpack
///@ts-ignore
export const BUILD_VERSION: string = SDK_VERSION;

if ((module as any).hot) {
  (module as any).hot.accept();
}
