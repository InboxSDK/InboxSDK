import once from 'lodash/once';
import loadScript from '../../common/load-script';

const loadPI = once(() => {
  return loadScript(process.env.IMPLEMENTATION_URL!, {
    // platform-implementation has no top-level vars so no need for function wrapping
    nowrap: true,
    // webpack adds a sourceURL comment.
    // This sourceURL includes cache breaking for error reporting in remote builds.
    disableSourceURL: true,
  });
});

export default loadPI;
