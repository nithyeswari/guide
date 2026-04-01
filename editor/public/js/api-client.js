/**
 * API Client — handles communication with the backend chat proxy
 * Supports SSE streaming for real-time response display
 */
const ApiClient = (() => {
  const API_BASE = '/api';

  /**
   * Send a chat request with SSE streaming
   * @param {Object} params
   * @param {string} params.selectedText - The text the user selected
   * @param {string} params.userPrompt - The user's additional prompt
   * @param {string} params.documentPath - Path to the current document
   * @param {Function} onChunk - Called with each text chunk as it arrives
   * @param {Function} onDone - Called when streaming is complete
   * @param {Function} onError - Called on error
   * @returns {AbortController} - Can be used to cancel the request
   */
  function streamChat({ selectedText, userPrompt, documentPath }, onChunk, onDone, onError) {
    const controller = new AbortController();

    fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedText, userPrompt, documentPath }),
      signal: controller.signal
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      function processStream() {
        return reader.read().then(({ done, value }) => {
          if (done) {
            // Process any remaining buffer
            if (buffer.trim()) {
              processSSELines(buffer, onChunk);
            }
            onDone();
            return;
          }

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep incomplete line in buffer

          processSSELines(lines.join('\n'), onChunk);

          return processStream();
        });
      }

      return processStream();
    })
    .catch(err => {
      if (err.name !== 'AbortError') {
        onError(err);
      }
    });

    return controller;
  }

  function processSSELines(text, onChunk) {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) {
            onChunk(parsed.text);
          }
          if (parsed.error) {
            console.error('Stream error:', parsed.error);
          }
        } catch (e) {
          // Non-JSON data line, treat as raw text
          if (data.trim()) onChunk(data);
        }
      }
    }
  }

  /**
   * Non-streaming chat (fallback)
   */
  async function chat({ selectedText, userPrompt, documentPath }) {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedText, userPrompt, documentPath, stream: false })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(err.error || 'Chat request failed');
    }

    return response.json();
  }

  /**
   * Health check
   */
  async function healthCheck() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  return { streamChat, chat, healthCheck };
})();
