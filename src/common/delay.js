export default function delay(time, value) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve.bind(null, value), time);
  });
}
