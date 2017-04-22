/* @flow */

import {defn} from 'ud';
import rateLimitQueuer from '../../common/rate-limit-queuer';
import ajax from '../../common/ajax';

const googleLimitedAjax = defn(module, rateLimitQueuer(ajax, 1000, 10));
export default googleLimitedAjax;
