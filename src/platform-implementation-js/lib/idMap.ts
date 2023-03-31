import * as s from '../style/gmail.css';

export default function idMap(id: string) {
  // Uses lazy initialization of style tags from style-loader
  return s[id];
}
