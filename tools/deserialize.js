#!/usr/bin/env babel-node

import concatStream from 'concat-stream';
import { deserialize } from '../src/platform-implementation-js/dom-driver/gmail/gmail-response-processor';

process.stdin.pipe(
  concatStream((buffer) => {
    const parsed = deserialize(buffer.toString());
    console.log(JSON.stringify(parsed, null, 2));
  })
);
