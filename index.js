const http = require('http');
var exec = require('child_process').exec;
const config = require('./config.json');
const port = config.mock_server;
const json_port = config.json_server;

const proxy = http.createServer((reqProxy, resProxy) => {
  console.log("url", reqProxy.url);
  resProxy.setHeader('Access-Control-Allow-Origin', '*');
  resProxy.setHeader('Access-Control-Request-Method', '*');
  resProxy.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
  resProxy.setHeader('Access-Control-Allow-Headers', '*');
  resProxy.setHeader("Content-Type", "application/json");

  http.get(`http://localhost:${config.json_server}${reqProxy.url}`, function (res) {
    const { statusCode } = res;
    const contentType = res.headers['content-type'];

    let error;
    if (statusCode !== 200) {
      error = new Error('Request Failed.\n' +
        `Status Code: ${statusCode}`);
    } else if (!/^application\/json/.test(contentType)) {
      error = new Error('Invalid content-type.\n' +
        `Expected application/json but received ${contentType}`);
    }
    if (error) {
      console.error(error.message);
      // Consume response data to free up memory

      resProxy.write('{"error":"true"}');
      resProxy.end();
      res.resume();
      return;
    }

    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      try {
        resProxy.write(rawData);
        resProxy.end();
      } catch (e) {
        resProxy.write('{"error":"true"}');
        resProxy.end();
      }
    });
  });
});

proxy.listen((port), function () {
  console.log(`json-server db.json --port ${json_port}`);
  exec(`json-server db.json --port ${json_port}`, function callback(error, stdout, stderr) {
    if (error) {
      console.log(error);
      process.exit();
    }
    console.log("running on port " + json_port);
  });
  console.log("running mock server in port " + port);
});