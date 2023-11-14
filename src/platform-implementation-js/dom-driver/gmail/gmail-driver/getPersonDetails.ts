import type { PersonDetails } from '../../../namespaces/user';
import type GmailDriver from '../gmail-driver';

export default async function getPersonDetails(
  driver: GmailDriver,
  emailAddress: string,
): Promise<PersonDetails | undefined> {
  // The request made here is based on the request Gmail makes when you paste an
  // email address into a recipient field in the compose window.
  const headers = driver.getPageCommunicator().getGoogleRequestHeaders();
  const requestBody = [
    [emailAddress],
    2,
    null,
    null,
    [null, null, null, ['GMAIL_COMPOSE_WEB_POPULOUS', null, 2]],
    [
      [
        [
          'person.name',
          'person.photo',
          'person.email',
          'person.phone',
          'person.email.certificate',
          'person.metadata',
          'person.name.metadata.verified',
          'person.email.metadata.verified',
          'person.phone.metadata.verified',
        ],
      ],
      null,
      [2, 1, 7, 8, 10],
      null,
      null,
      [],
    ],
    [],
    [null, null, [], null, null, [2], [[1]], null, [3]],
    [[23, 36, 14, 15]],
    [],
    null,
    null,
    null,
    null,
    null,
    [null, [null, 2]],
    null,
    [],
  ];
  const response = await fetch(
    'https://people-pa.clients6.google.com/$rpc/google.internal.people.v2.minimal.InternalPeopleMinimalService/ListPeopleByKnownId',
    {
      headers: {
        ...headers,
        accept: '*/*',
        'content-type': 'application/json+protobuf',
        'x-goog-authuser': '0',
        'x-user-agent': 'grpc-web-javascript/0.1',
      },
      body: JSON.stringify(requestBody),
      method: 'POST',
      credentials: 'include',
    },
  );
  if (!response.ok) {
    throw new Error(
      `Bad response from Google People API: ${response.status} ${response.statusText}`,
    );
  }
  return parseListPeopleByKnownIdResponse(await response.json());
}

export function parseListPeopleByKnownIdResponse(
  data: any,
): PersonDetails | undefined {
  const mainList = data[1]?.[0]?.[1];
  if (!mainList) {
    return undefined;
  }

  const response: PersonDetails = {};

  const nameBlock = mainList[2];
  if (nameBlock) {
    const firstEntry = nameBlock[0];
    if (firstEntry) {
      const fullName = firstEntry[1];
      if (typeof fullName === 'string') {
        response.fullName = fullName;
      }
      const firstName = firstEntry[3];
      if (typeof firstName === 'string') {
        response.firstName = firstName;
      }
      const lastName = firstEntry[4];
      if (typeof lastName === 'string') {
        response.lastName = lastName;
      }
      const nameSortOrder = firstEntry[5]?.[13];
      if (typeof nameSortOrder === 'string') {
        response.fullNameSortOrder = nameSortOrder;
      }
    }
  }

  const avatarBlock = mainList[3];
  if (avatarBlock) {
    const imageUrl = avatarBlock[0]?.[1];
    if (typeof imageUrl === 'string') {
      response.imageUrl = imageUrl;
    }
  }

  return response;
}
