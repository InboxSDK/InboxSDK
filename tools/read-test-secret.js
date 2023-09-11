#!/usr/bin/env node
'use strict';
const { createEncryptor } = require('simple-encryptor');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const encryptor = createEncryptor(
  process.env.INBOXSDK_TEST_SECRET ||
    fs.readFileSync(__dirname + '/../.inboxsdk_test_secret', 'utf8').trim(),
);

rl.question('Enter ciphertext: ', (ciphertext) => {
  const result = encryptor.decrypt(ciphertext);
  console.log(JSON.stringify(result, null, 2));
  rl.close();
});
