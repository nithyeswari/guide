/**
 * Selection Chat — detects text selection and manages the chat popup
 */
const SelectionChat = (() => {
  const popup = document.getElementById('chat-popup');
  const overlay = document.getElementById('chat-overlay');
  const selectedTextEl = document.getElementById('chat-selected-text');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  const chatClose = document.getElementById('chat-close');
  const chatResponse = document.getElementById('chat-response');
  const chatResponseContent = document.getElementById('chat-response-content');
  const chatActions = document.getElementById('chat-actions');
  const btnReplace = document.getElementById('btn-replace');
  const btnInsert = document.getElementById('btn-insert');
  const btnCopy = document.getElementById('btn-copy');

  let currentSelectedText = '';
  let currentResponseText = '';
  let currentResponseHtml = '';
  let streamController = null;
  let isStreaming = false;

  function init() {
    // Selection detection on document content
    document.getElementById('content-area').addEventListener('mouseup', handleSelection);

    // Close handlers
    chatClose.addEventListener('click', hidePopup);
    overlay.addEventListener('click', hidePopup);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hidePopup();
    });

    // Send button
    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Quick prompts
    document.querySelectorAll('.quick-prompt').forEach(btn => {
      btn.addEventListener('click', () => {
        chatInput.value = btn.dataset.prompt;
        sendMessage();
      });
    });

    // Action buttons
    btnReplace.addEventListener('click', handleReplace);
    btnInsert.addEventListener('click', handleInsert);
    btnCopy.addEventListener('click', handleCopy);

    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
    });
  }

  function handleSelection(e) {
    // Small delay to let selection finalize
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (!text || text.length < 3) return;

      // Check selection is within doc content
      const docContent = document.getElementById('doc-content');
      if (!docContent || !docContent.contains(selection.anchorNode)) return;

      // Save the range for later editing
      const range = selection.getRangeAt(0);
      InlineEdit.saveRange(range);

      // Get position for popup
      const rect = range.getBoundingClientRect();
      showPopup(text, rect);
    }, 10);
  }

  function showPopup(text, rect) {
    currentSelectedText = text;

    // Set selected text preview
    selectedTextEl.textContent = text.length > 200 ? text.slice(0, 200) + '...' : text;

    // Reset state
    chatInput.value = '';
    chatResponseContent.innerHTML = '';
    chatResponse.classList.remove('visible');
    chatActions.classList.remove('visible');
    chatSend.disabled = false;
    chatSend.textContent = 'Send';
    currentResponseText = '';
    currentResponseHtml = '';

    // Position popup near selection
    const popupWidth = 480;
    const popupMaxHeight = 520;
    const padding = 16;

    let left = Math.min(rect.left, window.innerWidth - popupWidth - padding);
    left = Math.max(padding, left);

    let top = rect.bottom + 12;
    // If not enough space below, show above
    if (top + popupMaxHeight > window.innerHeight) {
      top = rect.top - popupMaxHeight - 12;
      if (top < padding) top = padding;
    }

    popup.style.left = left + 'px';
    popup.style.top = top + 'px';

    // Show
    popup.classList.add('visible');
    overlay.classList.add('visible');
    chatInput.focus();
  }

  function hidePopup() {
    popup.classList.remove('visible');
    overlay.classList.remove('visible');

    // Cancel any in-flight stream
    if (streamController) {
      streamController.abort();
      streamController = null;
    }
    isStreaming = false;
  }

  function sendMessage() {
    const userPrompt = chatInput.value.trim();
    if (!userPrompt || isStreaming) return;

    isStreaming = true;
    chatSend.disabled = true;
    chatSend.textContent = '...';
    currentResponseText = '';
    currentResponseHtml = '';

    // Show response area with streaming cursor
    chatResponseContent.innerHTML = '<span class="streaming-cursor"></span>';
    chatResponse.classList.add('visible');
    chatActions.classList.remove('visible');

    // Get current document path for context
    const documentPath = window.__currentDocPath || '';

    streamController = ApiClient.streamChat(
      {
        selectedText: currentSelectedText,
        userPrompt: userPrompt,
        documentPath: documentPath
      },
      // onChunk
      (chunk) => {
        currentResponseText += chunk;
        // Render markdown as it streams
        try {
          currentResponseHtml = marked.parse(currentResponseText);
        } catch {
          currentResponseHtml = currentResponseText;
        }
        chatResponseContent.innerHTML = currentResponseHtml + '<span class="streaming-cursor"></span>';
        chatResponseContent.scrollTop = chatResponseContent.scrollHeight;
      },
      // onDone
      () => {
        isStreaming = false;
        chatSend.disabled = false;
        chatSend.textContent = 'Send';
        streamController = null;

        // Final render without cursor
        try {
          currentResponseHtml = marked.parse(currentResponseText);
        } catch {
          currentResponseHtml = currentResponseText;
        }
        chatResponseContent.innerHTML = currentResponseHtml;

        // Show action buttons
        chatActions.classList.add('visible');
      },
      // onError
      (err) => {
        isStreaming = false;
        chatSend.disabled = false;
        chatSend.textContent = 'Send';
        streamController = null;

        chatResponseContent.innerHTML = `<div style="color:var(--red)">Error: ${err.message}</div>
          <div style="color:var(--text3);font-size:11px;margin-top:8px">Make sure the server is running and ANTHROPIC_API_KEY is set.</div>`;
        chatResponse.classList.add('visible');
      }
    );
  }

  function handleReplace() {
    if (!currentResponseHtml) return;
    const success = InlineEdit.replaceSelection(currentResponseHtml);
    if (success) {
      hidePopup();
      showExportButton();
    }
  }

  function handleInsert() {
    if (!currentResponseHtml) return;
    const success = InlineEdit.insertBelow(currentResponseHtml);
    if (success) {
      hidePopup();
      showExportButton();
    }
  }

  function handleCopy() {
    if (!currentResponseText) return;
    navigator.clipboard.writeText(currentResponseText).then(() => {
      btnCopy.textContent = 'Copied!';
      setTimeout(() => { btnCopy.textContent = 'Copy'; }, 1500);
    });
  }

  function showExportButton() {
    const btn = document.getElementById('btn-export');
    if (btn) btn.style.display = 'flex';
  }

  return { init, hidePopup };
})();
