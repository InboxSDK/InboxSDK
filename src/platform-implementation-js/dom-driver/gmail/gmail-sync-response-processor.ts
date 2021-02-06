import BigNumber from 'bignumber.js';
import isNotNil from '../../lib/isNotNil';

interface Recipient {
  emailAddress: string;
  name?: string;
}

export interface SyncThread {
  subject: string;
  snippet: string;
  syncThreadID: string;
  oldGmailThreadID: string;
  rawResponse: any;
  extraMetaData: {
    snippet: string;
    syncMessageData: Array<{
      syncMessageID: string;
      oldMessageID?: string;
      date: number;
      recipients?: Recipient[];
    }>;
  };
}

export interface MinimalSyncThread {
  syncThreadID: string;
  extraMetaData: {
    syncMessageData: Array<{
      syncMessageID: string;
      date: number;
      recipients?: Recipient[];
    }>;
  };
}

export function extractThreadsFromSearchResponse(
  response: string
): SyncThread[] {
  const parsedResponse = JSON.parse(response);
  const threadDescriptors: any[] | null = parsedResponse && parsedResponse[3];

  if (!threadDescriptors) return [];

  return threadDescriptors
    .map((descriptorWrapper, index) => {
      const descriptor = descriptorWrapper[1];
      if (!descriptor) return null;

      return {
        subject: descriptor[1],
        snippet: descriptor[2],
        syncThreadID: descriptor[4],
        // It seems Gmail is A/B testing including gmailThreadID in descriptor[20] and not including
        // the encoded version of it in descriptor[18], so pull it from [20] if [18] is not set.
        oldGmailThreadID:
          descriptor[18] != null
            ? new BigNumber(descriptor[18]).toString(16)
            : descriptor[20],
        rawResponse: descriptorWrapper,
        extraMetaData: {
          snippet:
            (parsedResponse[15] &&
              parsedResponse[15][1] &&
              parsedResponse[15][1][index]) ||
            '',
          syncMessageData: descriptor[5].map((md: any) => ({
            syncMessageID: md[1],
            oldMessageID: md[56],
            date: +md[7]
          }))
        }
      };
    })
    .filter(isNotNil);
}

export function extractThreadsFromThreadResponse(
  response: string
): Array<SyncThread | MinimalSyncThread> {
  const parsedResponse = JSON.parse(response);

  const threadDescriptors: any[] | null = parsedResponse && parsedResponse[2];

  if (!threadDescriptors) throw new Error('Failed to process thread response');

  return threadDescriptors
    .map(descriptorWrapper => {
      if (
        typeof descriptorWrapper[1] === 'string' &&
        Array.isArray(descriptorWrapper[3]) &&
        !(
          descriptorWrapper[2] &&
          descriptorWrapper[2][1] &&
          descriptorWrapper[2][1][14] &&
          Array.isArray(descriptorWrapper[2][2])
        )
      ) {
        return {
          syncThreadID: descriptorWrapper[1],
          oldGmailThreadID:
            (descriptorWrapper[2] &&
              descriptorWrapper[2][1] &&
              descriptorWrapper[2][1][16]) ||
            undefined,
          extraMetaData: {
            snippet:
              (descriptorWrapper[2] &&
                descriptorWrapper[2][1] &&
                descriptorWrapper[2][1][3]) ||
              undefined,
            syncMessageData: (descriptorWrapper[3] || [])
              .filter(md => Boolean(md[2]))
              .map(md => ({
                syncMessageID: md[1],
                date: +md[2][17],
                recipients: getRecipientsFromMessageDescriptor(md)
              }))
          }
        } as MinimalSyncThread;
      } else {
        const threadDescriptor =
          descriptorWrapper[2] && descriptorWrapper[2][1];

        if (!threadDescriptor) return null;

        let syncMessageData;
        const fullMessageDescriptors =
          Array.isArray(descriptorWrapper[3]) && descriptorWrapper[3];

        if (fullMessageDescriptors) {
          syncMessageData = fullMessageDescriptors.map(md => ({
            syncMessageID: md[1],
            date: +md[2][17],
            recipients: getRecipientsFromMessageDescriptor(md)
          }));
        } else {
          const messageDescriptors =
            descriptorWrapper[2] && descriptorWrapper[2][2];

          syncMessageData = messageDescriptors.map((md: any) => ({
            syncMessageId: md[1],
            date: +md[16]
          }));
        }

        return {
          subject: threadDescriptor[2],
          snippet: threadDescriptor[3],
          syncThreadID: threadDescriptor[1],
          oldGmailThreadID: new BigNumber(threadDescriptor[14]).toString(16),
          rawResponse: descriptorWrapper,
          extraMetaData: {
            syncMessageData,
            snippet: ''
          }
        } as SyncThread;
      }
    })
    .filter(isNotNil);
}

function getRecipientsFromMessageDescriptor(
  messageDescriptor: Array<any>
): Recipient[] | void {
  if (!messageDescriptor[2]) return;

  const to = messageDescriptor[2][1] || [];
  const cc = messageDescriptor[2][2] || [];
  const bcc = messageDescriptor[2][3] || [];

  return to
    .concat(cc)
    .concat(bcc)
    .map((recipientDescriptor: any) => ({
      emailAddress: recipientDescriptor[2],
      name: recipientDescriptor[3]
    }));
}

export function replaceThreadsInSearchResponse(
  response: string,
  replacementThreads: SyncThread[],
  _unused: { start: number; total?: number | 'MANY' } // TODO why is this unused?
): string {
  const parsedResponse = JSON.parse(response);

  if (parsedResponse[3] || replacementThreads.length) {
    parsedResponse[3] = replacementThreads.map(({ rawResponse }, index) => ({
      ...rawResponse,
      '2': index
    }));
  }

  if (parsedResponse[15] || replacementThreads.length) {
    parsedResponse[15] = {
      ...parsedResponse[15],
      '1': replacementThreads.map(({ extraMetaData }) => extraMetaData.snippet),
      '2': replacementThreads.map(({ extraMetaData }) =>
        extraMetaData.syncMessageData.map(({ syncMessageID }) => syncMessageID)
      )
    };
  }

  return JSON.stringify(parsedResponse);
}
