const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const credentials = require('./oauth-credentials.json');
const tokens = require('./oauth-token.json');

const oauth2Client = new google.auth.OAuth2(
  credentials.installed.client_id,
  credentials.installed.client_secret,
  credentials.installed.redirect_uris[0]
);

oauth2Client.setCredentials(tokens);

// Refresh token if needed
oauth2Client.on('tokens', (newTokens) => {
  if (newTokens.refresh_token) {
    tokens.refresh_token = newTokens.refresh_token;
  }
  tokens.access_token = newTokens.access_token;
  tokens.expiry_date = newTokens.expiry_date;
  fs.writeFileSync(path.join(__dirname, 'oauth-token.json'), JSON.stringify(tokens, null, 2));
});

async function getAnalytics() {
  const analyticsData = google.analyticsdata({ version: 'v1beta', auth: oauth2Client });
  
  // GA4 Property ID for consignatarias.com.ar (G-6CZMZH9S6Y)
  // Need to find the numeric property ID
  const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: oauth2Client });
  
  try {
    // List accounts to find the property
    const accounts = await analyticsAdmin.accounts.list();
    console.log('=== GA4 ACCOUNTS ===');
    
    if (accounts.data.accounts) {
      for (const account of accounts.data.accounts) {
        console.log('Account:', account.displayName, '|', account.name);
        
        // List properties for this account
        const properties = await analyticsAdmin.properties.list({
          filter: `parent:${account.name}`
        });
        
        if (properties.data.properties) {
          for (const prop of properties.data.properties) {
            console.log('  Property:', prop.displayName, '|', prop.name);
            
            // If this looks like consignatarias, query it
            if (prop.displayName.toLowerCase().includes('consignataria')) {
              const propertyId = prop.name.replace('properties/', '');
              console.log('\n=== QUERYING', prop.displayName, '===');
              
              // Get last 7 days data
              const report = await analyticsData.properties.runReport({
                property: `properties/${propertyId}`,
                requestBody: {
                  dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
                  metrics: [
                    { name: 'activeUsers' },
                    { name: 'sessions' },
                    { name: 'screenPageViews' },
                    { name: 'bounceRate' },
                    { name: 'averageSessionDuration' }
                  ],
                  dimensions: [{ name: 'date' }],
                  orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }]
                }
              });
              
              console.log('\n--- ÚLTIMOS 7 DÍAS ---');
              if (report.data.rows) {
                let totalUsers = 0, totalSessions = 0, totalPageviews = 0;
                report.data.rows.forEach(row => {
                  const date = row.dimensionValues[0].value;
                  const users = parseInt(row.metricValues[0].value);
                  const sessions = parseInt(row.metricValues[1].value);
                  const pageviews = parseInt(row.metricValues[2].value);
                  totalUsers += users;
                  totalSessions += sessions;
                  totalPageviews += pageviews;
                  console.log(`${date}: ${users} users, ${sessions} sessions, ${pageviews} pageviews`);
                });
                console.log(`\nTOTAL: ${totalUsers} users, ${totalSessions} sessions, ${totalPageviews} pageviews`);
              }
              
              // Get top pages
              const pagesReport = await analyticsData.properties.runReport({
                property: `properties/${propertyId}`,
                requestBody: {
                  dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
                  metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
                  dimensions: [{ name: 'pagePath' }],
                  orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
                  limit: 15
                }
              });
              
              console.log('\n--- TOP PÁGINAS ---');
              if (pagesReport.data.rows) {
                pagesReport.data.rows.forEach(row => {
                  const page = row.dimensionValues[0].value;
                  const views = row.metricValues[0].value;
                  const users = row.metricValues[1].value;
                  console.log(`${views} views | ${users} users | ${page}`);
                });
              }
              
              // Get traffic sources
              const sourcesReport = await analyticsData.properties.runReport({
                property: `properties/${propertyId}`,
                requestBody: {
                  dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
                  metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
                  dimensions: [{ name: 'sessionSource' }],
                  orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                  limit: 10
                }
              });
              
              console.log('\n--- FUENTES DE TRÁFICO ---');
              if (sourcesReport.data.rows) {
                sourcesReport.data.rows.forEach(row => {
                  const source = row.dimensionValues[0].value;
                  const sessions = row.metricValues[0].value;
                  const users = row.metricValues[1].value;
                  console.log(`${sessions} sessions | ${users} users | ${source}`);
                });
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

getAnalytics();
