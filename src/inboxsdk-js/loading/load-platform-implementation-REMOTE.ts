import once from 'lodash/once';
import loadScript from '../../common/load-script';

const loadPI = once(() => {
  return loadScript(process.env.IMPLEMENTATION_URL!, {
    // platform-implementation has no top-level vars so no need for function wrapping
    nowrap: true,
  });
});

export default loadPI;
