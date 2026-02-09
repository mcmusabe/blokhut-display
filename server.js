const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'blokhut-admin-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(express.static('.'));

// Multer config voor file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = file.fieldname === 'video' ? 'assets/videos' : 'assets/images';
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, sanitized);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Alleen afbeeldingen (jpeg, jpg, png, gif, webp) en video\'s (mp4, mov, avi) zijn toegestaan'));
    }
  }
});

// Initialize auth.json if it doesn't exist
async function initAuthFile() {
  try {
    await fs.access('assets/auth.json');
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Create default auth file with hash of "admin"
      const defaultHash = await bcrypt.hash('admin', 10);
      await fs.writeFile('assets/auth.json', JSON.stringify({ passwordHash: defaultHash }, null, 2), 'utf8');
      console.log('assets/auth.json aangemaakt met standaard wachtwoord "admin"');
    }
  }
}

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ error: 'Niet ingelogd' });
}

// Public auth routes
app.post('/api/login', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Wachtwoord vereist' });
    }

    const authData = await fs.readFile('assets/auth.json', 'utf8').then(JSON.parse).catch(() => null);
    if (!authData || !authData.passwordHash) {
      return res.status(500).json({ error: 'Auth configuratie ontbreekt' });
    }

    const match = await bcrypt.compare(password, authData.passwordHash);
    if (match) {
      req.session.user = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'Onjuist wachtwoord' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Fout bij inloggen' });
  }
});

app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ loggedIn: true });
  } else {
    res.status(401).json({ error: 'Niet ingelogd' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Fout bij uitloggen' });
    }
    res.json({ success: true });
  });
});

// Initialize auth file on startup
initAuthFile();

// Protected API Routes
app.get('/api/slides', requireAuth, async (req, res) => {
  try {
    const data = await fs.readFile('assets/slides.json', 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/slides', requireAuth, async (req, res) => {
  try {
    // Validate JSON structure
    if (!Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Slides moet een array zijn' });
    }
    
    await fs.writeFile('assets/slides.json', JSON.stringify(req.body, null, 2), 'utf8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/news', requireAuth, async (req, res) => {
  try {
    const data = await fs.readFile('assets/news.json', 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/config', requireAuth, async (req, res) => {
  try {
    const data = await fs.readFile('assets/config.json', 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    // Als bestand niet bestaat, geef default config terug
    if (error.code === 'ENOENT') {
      const defaultConfig = {
        rssUrl: 'https://www.gld.nl/rss/index.xml',
        newsRefreshMinutes: 5
      };
      // Maak bestand aan met default waarden
      await fs.writeFile('assets/config.json', JSON.stringify(defaultConfig, null, 2), 'utf8').catch(() => {});
      return res.json(defaultConfig);
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/config', requireAuth, async (req, res) => {
  try {
    const body = req.body;
    if (typeof body !== 'object' || body === null) {
      return res.status(400).json({ error: 'Config moet een object zijn' });
    }
    const current = await fs.readFile('assets/config.json', 'utf8').then(JSON.parse).catch(() => ({}));
    const merged = { ...current, ...body };
    if (merged.rssUrl && typeof merged.rssUrl !== 'string') {
      return res.status(400).json({ error: 'rssUrl moet een string zijn' });
    }
    await fs.writeFile('assets/config.json', JSON.stringify(merged, null, 2), 'utf8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Geen bestand geüpload' });
  }
  const filePath = req.file.path.replace(/\\/g, '/');
  res.json({ path: filePath });
});

app.listen(PORT, () => {
  console.log(`Admin server draait op http://localhost:${PORT}`);
});
