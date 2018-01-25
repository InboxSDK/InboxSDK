/* @flow */

import BigNumber from 'bignumber.js';

export type SyncThread = {
  subject: string;
  snippet: string;
  syncThreadID: string;
  oldGmailThreadID: string;
  rawResponse: Object;
  extraMetaData: {
    snippet: string;
    syncMessageIDs: string[];
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
      syncThreadID: descriptor[4],
      oldGmailThreadID: new BigNumber(descriptor[18]).toString(16),
      rawResponse: descriptorWrapper,
      extraMetaData: {
        snippet: (
          parsedResponse[15] &&
          parsedResponse[15][1] &&
          parsedResponse[15][1][index]
        ) || '',
        syncMessageIDs: descriptor[5].map(md => md[1])
      }
    };

  })
  .filter(Boolean);

}


export function extractThreadsFromThreadResponse(response: string): SyncThread[] {
  const parsedResponse = JSON.parse(response);

  const threadDescriptors = (
    parsedResponse &&
    parsedResponse[2]
  );

  if(!threadDescriptors) throw new Error('Failed to process thread response');

  return threadDescriptors.map(descriptorWrapper => {
    const descriptor = (
      descriptorWrapper[2]
    );

    const threadDescriptor = (
      descriptorWrapper[2] &&
      descriptorWrapper[2][1]
    );

    const messageDescriptors = (
      descriptorWrapper[2] &&
      descriptorWrapper[2][2]
    ) || [];

    if(!threadDescriptor) return null;

    return {
      subject: threadDescriptor[2],
      snippet: threadDescriptor[3],
      syncThreadID: threadDescriptor[1],
      oldGmailThreadID: new BigNumber(threadDescriptor[14]).toString(16),
      rawResponse: descriptorWrapper,
      extraMetaData: {
        snippet: '',
        syncMessageIDs: messageDescriptors.map(md => (
          md[1]
        ))
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

  parsedResponse[3] = replacementThreads.map(({rawResponse}, index) => ({...rawResponse, '2': index}));
  parsedResponse[15][1] = replacementThreads.map(({extraMetaData}) => extraMetaData.snippet);
  parsedResponse[15][2] = replacementThreads.map(({extraMetaData}) => extraMetaData.syncMessageIDs);

  return JSON.stringify(parsedResponse);

}
