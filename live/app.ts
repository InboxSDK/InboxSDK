import hs from 'http-server';
import path from 'path';

export function run() {
  const server = hs.createServer({
    root: path.join(__dirname, '..', 'dist'),
    cache: 2,
    showDir: 'false',
    cors: true,
    robots: true,
  });
  server.listen(4567, 'localhost');
}
