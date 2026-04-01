const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const chatRoutes = require('./routes/chat');

// Load .env in development
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch {}

const app = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ──
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Rate limit the chat API
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Too many requests, slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── STATIC FILES ──
// Serve the editor frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve the docs directory
const docsPath = path.join(__dirname, '..', '..', 'docs');
app.use('/docs', express.static(docsPath));

// ── API ROUTES ──
app.use('/api', chatLimiter, chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Dynamic manifest generation
app.get('/api/manifest', (req, res) => {
  try {
    // Check for pre-generated manifest first
    const manifestPath = path.join(__dirname, '..', 'public', 'docs-manifest.json');
    if (fs.existsSync(manifestPath)) {
      return res.sendFile(manifestPath);
    }

    // Generate dynamically
    const tree = buildManifestTree(docsPath, '');
    res.json({ tree });
  } catch (err) {
    console.error('Manifest generation error:', err);
    res.status(500).json({ error: 'Failed to generate manifest' });
  }
});

function buildManifestTree(dirPath, relativePath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const folders = [];
  const files = [];

  for (const entry of entries) {
    const entryRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const children = buildManifestChildren(path.join(dirPath, entry.name), entryRelative);
      if (children.length > 0) {
        folders.push({
          name: entry.name,
          open: false,
          children: children
        });
      }
    }
  }

  // Also include root-level files
  for (const entry of entries) {
    if (entry.isFile() && isDocFile(entry.name)) {
      const entryRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      files.push({
        name: extractTitle(path.join(dirPath, entry.name), entry.name),
        path: entryRelative,
        type: path.extname(entry.name).slice(1)
      });
    }
  }

  if (files.length > 0) {
    folders.unshift({
      name: relativePath || 'root',
      open: true,
      children: files
    });
  }

  return folders;
}

function buildManifestChildren(dirPath, relativePath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const children = [];

  for (const entry of entries) {
    const entryRelative = `${relativePath}/${entry.name}`;

    if (entry.isFile() && isDocFile(entry.name)) {
      children.push({
        name: extractTitle(path.join(dirPath, entry.name), entry.name),
        path: entryRelative,
        type: path.extname(entry.name).slice(1)
      });
    } else if (entry.isDirectory()) {
      // Include nested files with subfolder prefix
      const nested = buildManifestChildren(path.join(dirPath, entry.name), entryRelative);
      children.push(...nested);
    }
  }

  return children;
}

function isDocFile(filename) {
  return /\.(md|html|htm|java|json|yaml|yml|properties|xml|txt|csv)$/i.test(filename);
}

function extractTitle(filePath, fallback) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const content = fs.readFileSync(filePath, 'utf8').slice(0, 500);

    if (ext === '.md') {
      const match = content.match(/^#\s+(.+)/m);
      if (match) return match[1].trim();
    }

    if (ext === '.html' || ext === '.htm') {
      const match = content.match(/<title>(.+?)<\/title>/i);
      if (match) return match[1].trim();
    }
  } catch {}

  // Clean up filename as fallback
  return fallback.replace(/\.\w+$/, '').replace(/[-_]/g, ' ');
}

// ── SPA FALLBACK ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── START ──
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  Living Document Editor`);
    console.log(`  ─────────────────────`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Docs:    http://localhost:${PORT}/docs/`);
    console.log(`  API:     http://localhost:${PORT}/api/health`);
    console.log(`  API Key: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'NOT SET (set ANTHROPIC_API_KEY)'}`);
    console.log('');
  });
}

// Export for Firebase Functions
module.exports = app;
