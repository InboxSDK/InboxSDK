/* @flow */

export function extractMessageIdsFromThreadResponse(response: string): string[] {
  const threadResponse = JSON.parse(response);
  const messageDescriptors = (
    threadResponse &&
    threadResponse[2] &&
    threadResponse[2][0] &&
    threadResponse[2][0][3]
  );
  if (!messageDescriptors) throw new Error('Failed to process thread response');

  return messageDescriptors.map((descriptor) => descriptor[1]).filter(Boolean);
}
