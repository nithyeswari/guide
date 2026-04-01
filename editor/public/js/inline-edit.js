/**
 * Inline Edit — insert or replace content in the document
 */
const InlineEdit = (() => {
  let lastRange = null;

  /**
   * Store the current selection range for later use
   */
  function saveRange(range) {
    lastRange = range ? range.cloneRange() : null;
  }

  /**
   * Get the saved range
   */
  function getRange() {
    return lastRange;
  }

  /**
   * Replace the saved selection with new HTML content
   * @param {string} html - HTML content to insert
   */
  function replaceSelection(html) {
    if (!lastRange) {
      console.warn('No saved selection range');
      return false;
    }

    try {
      // Create a wrapper with AI indicator
      const wrapper = document.createElement('span');
      wrapper.className = 'ai-edit';
      wrapper.setAttribute('data-edited', 'true');
      wrapper.innerHTML = html;

      // Delete the selected content and insert new
      lastRange.deleteContents();
      lastRange.insertNode(wrapper);

      // Clean up selection
      const selection = window.getSelection();
      selection.removeAllRanges();

      lastRange = null;
      return true;
    } catch (err) {
      console.error('Replace failed:', err);
      return false;
    }
  }

  /**
   * Insert new HTML content below the selection's parent block
   * @param {string} html - HTML content to insert
   */
  function insertBelow(html) {
    if (!lastRange) {
      console.warn('No saved selection range');
      return false;
    }

    try {
      // Find the nearest block-level parent
      let parent = lastRange.endContainer;
      const blockTags = ['P', 'DIV', 'SECTION', 'BLOCKQUOTE', 'LI', 'TR', 'PRE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];

      while (parent && parent.nodeType !== 1) {
        parent = parent.parentNode;
      }

      while (parent && !blockTags.includes(parent.tagName)) {
        if (parent.id === 'doc-content') break;
        parent = parent.parentNode;
      }

      if (!parent) {
        console.warn('Could not find block parent');
        return false;
      }

      // Create wrapper element
      const wrapper = document.createElement('div');
      wrapper.className = 'ai-edit';
      wrapper.setAttribute('data-edited', 'true');
      wrapper.innerHTML = html;

      // Insert after the parent block
      if (parent.nextSibling) {
        parent.parentNode.insertBefore(wrapper, parent.nextSibling);
      } else {
        parent.parentNode.appendChild(wrapper);
      }

      // Scroll into view
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Clean up
      const selection = window.getSelection();
      selection.removeAllRanges();
      lastRange = null;

      return true;
    } catch (err) {
      console.error('Insert failed:', err);
      return false;
    }
  }

  /**
   * Export the current document content as HTML
   */
  function exportDocument() {
    const docContent = document.getElementById('doc-content');
    if (!docContent) return null;
    return docContent.innerHTML;
  }

  /**
   * Download the document as an HTML file
   */
  function downloadDocument(filename) {
    const html = exportDocument();
    if (!html) return;

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${filename}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
${document.querySelector('link[href*="theme.css"]') ? '' : '/* Theme styles */'}
body { background: #07090f; color: #ccd6f6; font-family: 'IBM Plex Sans', sans-serif; padding: 48px; max-width: 900px; margin: 0 auto; }
</style>
<link rel="stylesheet" href="/css/theme.css">
<link rel="stylesheet" href="/css/editor.css">
</head>
<body>
<div class="doc-scope">
${html}
</div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'document.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  return { saveRange, getRange, replaceSelection, insertBelow, exportDocument, downloadDocument };
})();
