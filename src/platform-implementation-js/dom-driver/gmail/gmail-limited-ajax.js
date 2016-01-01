/* @flow */

import {defn} from 'ud';
import rateLimitQueuer from '../../../common/rate-limit-queuer';
import ajax from '../../../common/ajax';
import type {ajaxOpts, ajaxResponse} from '../../../common/ajax';

const gmailLimitedAjax = defn(module, rateLimitQueuer(ajax, 1000, 10));
export default gmailLimitedAjax;
