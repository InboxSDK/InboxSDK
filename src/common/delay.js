import RSVP from 'rsvp';

export default function delay(time, value) {
  return new RSVP.Promise((resolve, reject) => {
    setTimeout(resolve.bind(null, value), time);
  });
}
