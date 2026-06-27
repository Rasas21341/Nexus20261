const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');
const app = express();

const PORT = 3000;
const CLIENT_ID = '1513645842983161906';
const CLIENT_SECRET = '74WfNdyh8QVCN8qjOQV2-3rIUstRfVU5'; // Replace with your actual client secret
const REDIRECT_URI = 'http://localhost:3000/auth/discord/callback';

// Session Middleware Configuration
app.use(session({
  name: 'nexussession',
  secret: 'nexus-secure-platform-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if running on production HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 Hours
  }
}));

app.use(express.json());

// Serves static files out of root directories (one folder up from server.js)
app.use(express.static(path.join(__dirname, '../'))); 

// 1. Core OAuth2 Callback Route Handshake
app.get('/auth/discord/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing authorization code.');

  try {
    // Exchange Auth Code for Access Token
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenResponse.data.access_token;

    // Fetch User Identity via Bearer Token Access Points
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // Populate Secure Session Context Parameters dynamically
    req.session.user = {
      id: userResponse.data.id,
      username: userResponse.data.username,
      avatar: userResponse.data.avatar,
      globalname: userResponse.data.global_name || userResponse.data.username
    };

    // Redirect straight back to your panel dashboard interface
    res.redirect('/Main%20Dashboard/panel.html');

  } catch (error) {
    console.error('OAuth2 Error:', error.response?.data || error.message);
    res.status(500).send('Authentication processing failed.');
  }
});

// 2. Hydration Data Endpoint Route API
app.get('/api/user', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ loggedIn: false, error: 'Unauthorized Session' });
  }
  res.json({ loggedIn: true, user: req.session.user });
});

// 3. Destructive Logout Route Endpoint Session Scrubbing
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Failed to clean up authentication profile.');
    }
    res.clearCookie('nexussession');
    // Clear out client space history and force redirect to standard gateway template
    res.redirect('/Main%20Dashboard/login%20page.html');
  });
});

app.listen(PORT, () => {
  console.log(`Nexus Backend Core running dynamically at http://localhost:${PORT}`);
});