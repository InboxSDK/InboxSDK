import zip from 'lodash/zip';
export default function parseParamsFromRouteID(
  routeID: string,
  hash: string
): Record<string, string> {
  const params: Record<string, string> = Object.create(null) as any;
  zip(routeID.split('/'), hash.split('/')).forEach(
    ([routePart, hashPart], i) => {
      if (routePart[0] === ':') {
        params[routePart.slice(1)] = decodeURIComponent(
          hashPart.replace(/\+/g, ' ')
        );
      }
    }
  );
  return Object.freeze(params);
}
