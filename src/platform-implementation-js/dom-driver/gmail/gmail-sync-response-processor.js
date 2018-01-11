/* @flow */

import BigNumber from 'bignumber.js';

type SyncThread = {
  subject: string;
  snippet: string;
  syncThreadId: string;
  oldGmailThreadId: string;
  rawResponse: Object;
  extraMetaData: {
    snippet: string;
    messageIDs: string[];
  };
};

export function extractThreadsFromSearchResponse(response: string): SyncThread[] {

  const parsedResponse = JSON.parse(response);
  const threadDescriptors = (
    parsedResponse &&
    parsedResponse[3]
  );

  if(!threadDescriptors) throw new Error('Failed to process search response');

  return threadDescriptors.map((descriptorWrapper, index) => {
    const descriptor = descriptorWrapper[1];
    if(!descriptor) return null;

    return {
      subject: descriptor[1],
      snippet: descriptor[2],
      syncThreadId: descriptor[4],
      oldGmailThreadId: new BigNumber(descriptor[18]).toString(16),
      rawResponse: descriptorWrapper,
      extraMetaData: {
        snippet: parsedResponse[15][1][index],
        messageIDs: parsedResponse[15][2][index]
      }
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
      oldGmailThreadId: new BigNumber(descriptor[14]).toString(16),
      rawResponse: descriptorWrapper,
      extraMetaData: {
        snippet: '',
        messageIDs: []
      }
    };
  })
  .filter(Boolean);

}


export function replaceThreadsInSearchResponse(
  response: string,
  replacementThreads: SyncThread[],
  { start, total }: { start: number, total?: number|'MANY' }
): string {

  const parsedResponse = JSON.parse(response);

  parsedResponse[2] = replacementThreads.map(({rawResponse}) => rawResponse);
  parsedResponse[15][1] = replacementThreads.map(({extraMetaData}) => extraMetaData.snippet);
  parsedResponse[15][2] = replacementThreads.map(({extraMetaData}) => extraMetaData.messageIDs);

  return JSON.stringify(parsedResponse);

}
