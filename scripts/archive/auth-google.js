const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const credentials = require('./oauth-credentials.json');

const oauth2Client = new google.auth.OAuth2(
  credentials.installed.client_id,
  credentials.installed.client_secret,
  'http://localhost:3333'
);

// Scopes needed for Analytics and Search Console
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});

console.log('Abriendo navegador para autorizar...\n');
console.log('Si no se abre, copiá este link:\n');
console.log(authUrl);
console.log('\n');

// Open browser
const start = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
exec(`${start} "${authUrl}"`);

// Start local server to catch the callback
const server = http.createServer(async (req, res) => {
  const queryParams = url.parse(req.url, true).query;
  
  if (queryParams.code) {
    try {
      const { tokens } = await oauth2Client.getToken(queryParams.code);
      
      // Save tokens
      fs.writeFileSync(
        path.join(__dirname, 'oauth-token.json'),
        JSON.stringify(tokens, null, 2)
      );
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>✅ Autorización exitosa!</h1><p>Podés cerrar esta ventana.</p>');
      
      console.log('✅ Token guardado en oauth-token.json');
      console.log('\nAhora podés ejecutar: node scripts/check-analytics.js');
      
      server.close();
      process.exit(0);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>❌ Error</h1><pre>${error.message}</pre>`);
      console.error('Error:', error.message);
    }
  }
});

server.listen(3333, () => {
  console.log('Servidor escuchando en http://localhost:3333');
  console.log('Esperando autorización...');
});
