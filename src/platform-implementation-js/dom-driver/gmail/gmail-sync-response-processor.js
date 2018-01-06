/* @flow */

import BigNumber from 'bignumber.js';

type SyncThread = {
  subject: string;
  snippet: string;
  syncThreadId: string;
  oldGmailThreadId: string;
};

export function extractThreadsFromSearchResponse(response: string): SyncThread[] {

  const parsedResponse = JSON.parse(response);
  const threadDescriptors = (
    parsedResponse &&
    parsedResponse[3]
  );

  if(!threadDescriptors) throw new Error('Failed to process search response');

  return threadDescriptors.map(descriptorWrapper => {
    const descriptor = descriptorWrapper[1];
    if(!descriptor) return null;

    return {
      subject: descriptor[1],
      snippet: descriptor[2],
      syncThreadId: descriptor[4],
      oldGmailThreadId: new BigNumber(descriptor[18]).toString(16)
    };

  })
  .filter(Boolean);

}


export function extractThreadsFromThreadResponse(response: string): SyncThread {
  const parsedResponse = JSON.parse(response);

  const threadDescriptors = (
    parsedResponse &&
    parsedResponse[2]
  );

  if(!threadDescriptors) throw new Error('Failed to process thread response');

  return threadDescriptors.map(descriptorWrapper => {
    const descriptor = (
      descriptorWrapper[2] &&
      descriptorWrapper[2][1]
    );

    if(!descriptor) return null;

    return {
      subject: descriptor[2],
      snippet: descriptor[3],
      syncThreadId: descriptor[1],
      oldGmailThreadId: new BigNumber(descriptor[14]).toString(16)
    };
  })
  .filter(Boolean);

}
