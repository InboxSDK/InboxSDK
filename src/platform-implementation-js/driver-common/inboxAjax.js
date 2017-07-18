/* @flow */

import {defn} from 'ud';
import rateLimitQueuer from '../../common/rate-limit-queuer';
import ajax from '../../common/ajax';

const inboxAjax = defn(module, rateLimitQueuer(ajax, 1000, 7));
export default inboxAjax;
