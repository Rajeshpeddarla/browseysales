const http = require('https');
const data = 'q=' + encodeURIComponent('site:linkedin.com/in/ ("CEO" OR "CTO" OR "VP Sales" OR "Head of" OR "Founder") "fireflies.ai"');

const options = {
  hostname: 'lite.duckduckgo.com',
  port: 443,
  path: '/lite/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': data.length,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(body));
});
req.write(data);
req.end();
