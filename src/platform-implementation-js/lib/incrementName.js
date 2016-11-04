/* @flow */

export default function incrementName(name: string): string {
  const m = / (\d+)$/.exec(name);
  if (m) {
    return name.slice(0, name.length-m[0].length)+' '+(Number(m[1])+1);
  }
  return name+' 2';
}
