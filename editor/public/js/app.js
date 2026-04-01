/**
 * App — main entry point for the Living Document Editor
 * Handles: sidebar tree, document loading, markdown rendering, routing
 */
(function () {
  'use strict';

  // Configure marked for GFM
  marked.setOptions({
    gfm: true,
    breaks: false,
    pedantic: false
  });

  const sidebarTree = document.getElementById('sidebar-tree');
  const docContent = document.getElementById('doc-content');
  const welcome = document.getElementById('welcome');
  const breadcrumb = document.getElementById('breadcrumb');
  const contentArea = document.getElementById('content-area');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const searchInput = document.getElementById('search-input');
  const btnExport = document.getElementById('btn-export');
  const btnRaw = document.getElementById('btn-raw');

  let manifest = null;
  let currentPath = null;
  let isRawView = false;

  // ── INIT ──
  async function init() {
    // Load manifest
    try {
      const res = await fetch('/docs-manifest.json');
      manifest = await res.json();
    } catch {
      // Fallback: try to load dynamically
      try {
        const res = await fetch('/api/manifest');
        manifest = await res.json();
      } catch {
        manifest = { tree: [] };
        console.warn('Could not load docs manifest');
      }
    }

    renderTree(manifest.tree);
    setupEventListeners();
    SelectionChat.init();

    // Handle URL hash routing
    if (window.location.hash) {
      const path = decodeURIComponent(window.location.hash.slice(1));
      loadDocument(path);
    }
  }

  // ── SIDEBAR TREE ──
  function renderTree(tree, filter = '') {
    sidebarTree.innerHTML = '';
    const lowerFilter = filter.toLowerCase();

    tree.forEach(folder => {
      const children = folder.children.filter(child =>
        !lowerFilter || child.name.toLowerCase().includes(lowerFilter) || child.path.toLowerCase().includes(lowerFilter)
      );

      if (children.length === 0 && lowerFilter) return;

      const folderEl = document.createElement('div');
      folderEl.className = 'tree-folder' + (lowerFilter || folder.open ? ' open' : '');

      const headerEl = document.createElement('div');
      headerEl.className = 'tree-folder-header';
      headerEl.innerHTML = `<span class="arrow">&#9656;</span><span class="folder-icon">&#128193;</span> ${escapeHtml(folder.name)}`;
      headerEl.addEventListener('click', () => folderEl.classList.toggle('open'));

      const childrenEl = document.createElement('div');
      childrenEl.className = 'tree-children';

      children.forEach(child => {
        const fileEl = document.createElement('div');
        fileEl.className = 'tree-file' + (child.path === currentPath ? ' active' : '');
        const ext = child.path.split('.').pop();
        fileEl.innerHTML = `<span class="file-icon">&#128196;</span> ${escapeHtml(child.name)} <span class="file-ext">.${ext}</span>`;
        fileEl.addEventListener('click', () => loadDocument(child.path));
        childrenEl.appendChild(fileEl);
      });

      folderEl.appendChild(headerEl);
      folderEl.appendChild(childrenEl);
      sidebarTree.appendChild(folderEl);
    });
  }

  // ── DOCUMENT LOADING ──
  async function loadDocument(path) {
    if (!path) return;

    currentPath = path;
    window.__currentDocPath = path;
    window.location.hash = encodeURIComponent(path);
    isRawView = false;

    // Update breadcrumb
    breadcrumb.innerHTML = path.split('/').map(p =>
      `<span>${escapeHtml(p)}</span>`
    ).join(' / ');

    // Update active state in sidebar
    document.querySelectorAll('.tree-file').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tree-file').forEach(el => {
      if (el.textContent.includes(path.split('/').pop().replace(/\.\w+$/, ''))) {
        el.classList.add('active');
      }
    });

    // Show loading
    welcome.style.display = 'none';
    docContent.style.display = 'block';
    docContent.innerHTML = '<div class="loading"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div><span>Loading...</span></div>';

    // Show toolbar buttons
    if (btnRaw) btnRaw.style.display = 'flex';

    try {
      const response = await fetch('/docs/' + path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();

      const ext = path.split('.').pop().toLowerCase();
      if (ext === 'html' || ext === 'htm') {
        renderHtmlDocument(text);
      } else {
        renderMarkdownDocument(text);
      }

      // Scroll to top
      contentArea.scrollTop = 0;

      // Re-animate
      docContent.style.animation = 'none';
      docContent.offsetHeight; // trigger reflow
      docContent.style.animation = 'fadeUp 0.4s ease both';

    } catch (err) {
      docContent.innerHTML = `<div style="color:var(--red);font-family:var(--mono);padding:20px">
        Error loading document: ${escapeHtml(err.message)}
      </div>`;
    }
  }

  function renderMarkdownDocument(mdText) {
    try {
      const html = marked.parse(mdText);
      docContent.innerHTML = html;
    } catch (err) {
      docContent.innerHTML = `<pre style="color:var(--text2)">${escapeHtml(mdText)}</pre>`;
    }
  }

  function renderHtmlDocument(htmlText) {
    // Extract body content
    let bodyContent = htmlText;
    const bodyMatch = htmlText.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      bodyContent = bodyMatch[1];
    }

    // Extract styles
    const styles = [];
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    let styleMatch;
    while ((styleMatch = styleRegex.exec(htmlText)) !== null) {
      styles.push(styleMatch[1]);
    }

    // Remove scripts from body content (we'll re-execute them)
    const scripts = [];
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptMatch;
    while ((scriptMatch = scriptRegex.exec(bodyContent)) !== null) {
      scripts.push(scriptMatch[1]);
    }
    bodyContent = bodyContent.replace(scriptRegex, '');

    // Inject styles in a scoped wrapper
    let scopedStyles = '';
    if (styles.length) {
      // Prefix styles with .doc-scope to avoid conflicts
      scopedStyles = `<style>${styles.join('\n')}</style>`;
    }

    docContent.innerHTML = scopedStyles + bodyContent;

    // Re-execute scripts
    scripts.forEach(scriptContent => {
      if (scriptContent.trim()) {
        const scriptEl = document.createElement('script');
        scriptEl.textContent = scriptContent;
        docContent.appendChild(scriptEl);
      }
    });
  }

  // ── EVENT LISTENERS ──
  function setupEventListeners() {
    // Sidebar toggle
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      sidebar.classList.toggle('mobile-open');
    });

    // Search
    searchInput.addEventListener('input', (e) => {
      if (manifest) renderTree(manifest.tree, e.target.value);
    });

    // Export
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const filename = currentPath ? currentPath.split('/').pop().replace(/\.\w+$/, '') + '-edited.html' : 'document.html';
        InlineEdit.downloadDocument(filename);
      });
    }

    // Raw toggle
    if (btnRaw) {
      btnRaw.addEventListener('click', async () => {
        if (!currentPath) return;
        if (isRawView) {
          loadDocument(currentPath);
          return;
        }
        isRawView = true;
        try {
          const res = await fetch('/docs/' + currentPath);
          const text = await res.text();
          docContent.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-word;color:var(--text2);font-family:var(--mono);font-size:12px;line-height:1.6">${escapeHtml(text)}</pre>`;
        } catch (err) {
          docContent.innerHTML = `<div style="color:var(--red)">Error: ${err.message}</div>`;
        }
      });
    }

    // Hash change
    window.addEventListener('hashchange', () => {
      const path = decodeURIComponent(window.location.hash.slice(1));
      if (path && path !== currentPath) loadDocument(path);
    });
  }

  // ── UTILS ──
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── START ──
  document.addEventListener('DOMContentLoaded', init);
})();
