const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const credentials = require('./oauth-credentials.json');
const tokens = require('./oauth-token.json');

const oauth2Client = new google.auth.OAuth2(
  credentials.installed.client_id,
  credentials.installed.client_secret,
  'http://localhost:3333'
);

oauth2Client.setCredentials({
  refresh_token: tokens.refresh_token
});

async function refreshToken() {
  try {
    const { credentials: newCreds } = await oauth2Client.refreshAccessToken();
    
    const newTokens = {
      ...tokens,
      access_token: newCreds.access_token,
      expiry_date: newCreds.expiry_date
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'oauth-token.json'),
      JSON.stringify(newTokens, null, 2)
    );
    
    console.log('✅ Token refreshed successfully!');
    console.log('New expiry:', new Date(newCreds.expiry_date).toISOString());
  } catch (error) {
    console.error('❌ Error refreshing token:', error.message);
    if (error.response) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

refreshToken();
