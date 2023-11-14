import type _loadScript from '../common/load-script';

export let loadScript: typeof _loadScript = () => {
  throw new Error('This function is not usable in Chrome MV3 extensions');
};
export function setLoadScript(fn: typeof _loadScript) {
  loadScript = fn;
}
