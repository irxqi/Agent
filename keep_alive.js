import http from 'http';

const server = http.createServer((req, res) => {
  res.write("I'm alive");
  res.end();
});

server.listen(8080, () => {
  console.log('Server is running on port 8080');
});
