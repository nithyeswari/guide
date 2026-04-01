#!/usr/bin/env node
/**
 * Generate docs-manifest.json from the docs/ directory
 * Run: node scripts/generate-manifest.js
 */
const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', '..', 'docs');
const OUTPUT = path.join(__dirname, '..', 'public', 'docs-manifest.json');

const DOC_EXTENSIONS = new Set(['.md', '.html', '.htm', '.java', '.json', '.yaml', '.yml', '.properties', '.xml', '.txt', '.csv']);

function extractTitle(filePath, filename) {
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

  return filename.replace(/\.\w+$/, '').replace(/[-_]/g, ' ');
}

function buildTree(dirPath, relativePath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true }).sort((a, b) => {
    // Folders first, then files alphabetically
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  const tree = [];

  // Process directories
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    const fullPath = path.join(dirPath, entry.name);
    const childRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    const children = buildChildren(fullPath, childRelative);

    if (children.length > 0) {
      tree.push({
        name: entry.name,
        open: false,
        children: children
      });
    }
  }

  // Root-level files
  const rootFiles = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!DOC_EXTENSIONS.has(ext)) continue;

    const fullPath = path.join(dirPath, entry.name);
    const fileRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    rootFiles.push({
      name: extractTitle(fullPath, entry.name),
      path: fileRelative,
      type: ext.slice(1)
    });
  }

  if (rootFiles.length > 0) {
    tree.unshift({
      name: 'guides',
      open: true,
      children: rootFiles
    });
  }

  return tree;
}

function buildChildren(dirPath, relativePath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const children = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const fullPath = path.join(dirPath, entry.name);
    const childRelative = `${relativePath}/${entry.name}`;

    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!DOC_EXTENSIONS.has(ext)) continue;

      children.push({
        name: extractTitle(fullPath, entry.name),
        path: childRelative,
        type: ext.slice(1)
      });
    } else if (entry.isDirectory() && entry.name !== 'node_modules') {
      const nested = buildChildren(fullPath, childRelative);
      children.push(...nested);
    }
  }

  return children;
}

// ── Generate ──
console.log('Scanning docs directory:', DOCS_DIR);
const tree = buildTree(DOCS_DIR, '');

let totalFiles = 0;
function countFiles(items) {
  for (const item of items) {
    if (item.children) countFiles(item.children);
    else totalFiles++;
  }
}
countFiles(tree);

const manifest = { tree, generatedAt: new Date().toISOString(), totalFiles };

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(manifest, null, 2));
console.log(`Generated manifest: ${totalFiles} files in ${tree.length} sections`);
console.log('Output:', OUTPUT);
