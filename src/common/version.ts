// This is in its own file so that updates to the version value don't cause a
// reload of everything.

export const BUILD_VERSION: string = process.env.VERSION!;

if ((module as any).hot) {
  (module as any).hot.accept();
}
