#!/usr/bin/env node
'use strict';
const { createEncryptor } = require('simple-encryptor');
const fs = require('fs');

async function read(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const encryptor = createEncryptor(
  process.env.INBOXSDK_TEST_SECRET ||
    fs.readFileSync(__dirname + '/../.inboxsdk_test_secret', 'utf8').trim(),
);

async function main() {
  console.error('Enter plaintext and then press ctrl-D:');
  const plaintext = await read(process.stdin);
  const plainobj = JSON.parse(plaintext);
  const ciphertext = encryptor.encrypt(plainobj);
  console.log(ciphertext);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
