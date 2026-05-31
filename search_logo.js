const https = require('https');
const q = encodeURIComponent('Nuvoco Occupational Health Safety Environment logo svg filetype:svg');
https.get(`https://html.duckduckgo.com/html/?q=${q}`, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.slice(0, 500)));
});
