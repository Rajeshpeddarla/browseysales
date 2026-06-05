const http = require('https');
http.get('https://html.duckduckgo.com/html/?q=' + encodeURIComponent('site:linkedin.com/in/ ("CEO" OR "CTO" OR "VP Sales" OR "Head of" OR "Founder") "fireflies.ai"'), (res) => {
  let data = '';
  res.on('data', c => data+=c);
  res.on('end', () => console.log(data));
});
