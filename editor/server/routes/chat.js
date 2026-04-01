const Anthropic = require('@anthropic-ai/sdk');
const express = require('express');
const router = express.Router();

const SYSTEM_PROMPT = `You are an expert technical editor embedded in a living document editor.
The user has selected text from a technical engineering document and wants your help.

Your role:
- When asked to explain: provide clear, accurate explanations
- When asked to rewrite: maintain the technical depth and style of the original
- When asked to expand: add practical examples and deeper detail
- When asked to review: identify inaccuracies, gaps, or improvements
- Format your response in markdown
- Be concise but thorough
- Match the tone and style of the original document`;

// POST /api/chat — stream a Claude response
router.post('/chat', async (req, res) => {
  const { selectedText, userPrompt, documentPath, stream = true } = req.body;

  if (!selectedText || !userPrompt) {
    return res.status(400).json({ error: 'selectedText and userPrompt are required' });
  }

  if (selectedText.length > 4000) {
    return res.status(400).json({ error: 'Selected text too long (max 4000 chars)' });
  }

  if (userPrompt.length > 2000) {
    return res.status(400).json({ error: 'Prompt too long (max 2000 chars)' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on the server' });
  }

  const client = new Anthropic({ apiKey });

  const userMessage = `**Document:** ${documentPath || 'unknown'}

**Selected text:**
> ${selectedText}

**Request:** ${userPrompt}`;

  try {
    if (stream) {
      // SSE streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const messageStream = client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }]
      });

      messageStream.on('text', (text) => {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      });

      messageStream.on('error', (err) => {
        console.error('Stream error:', err.message);
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      });

      messageStream.on('end', () => {
        res.write('data: [DONE]\n\n');
        res.end();
      });

      // Handle client disconnect
      req.on('close', () => {
        messageStream.abort();
      });

    } else {
      // Non-streaming response
      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }]
      });

      const responseText = message.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('');

      res.json({ response: responseText });
    }
  } catch (err) {
    console.error('Claude API error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to call Claude API: ' + err.message });
    }
  }
});

module.exports = router;
