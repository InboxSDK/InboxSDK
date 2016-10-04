#!/usr/bin/env babel-node
/* @flow */

import concatStream from 'concat-stream';
import {serialize} from '../src/platform-implementation-js/dom-driver/gmail/gmail-response-processor';

process.stdin.pipe(concatStream(buffer => {
  const {value, options} = JSON.parse(buffer.toString());
  const serialized = serialize(value, options);
  process.stdout.write(serialized);
}));
