const https = require('https');
https.get('https://raw.githubusercontent.com/FortAwesome/Font-Awesome/master/svgs/solid/hand-holding-heart.svg', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => { console.log(data); });
}).on("error", (err) => { console.log("Error: " + err.message); });
