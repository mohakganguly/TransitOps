import { Router } from 'express';

const router = Router();
const ASSISTANT_SERVICE_URL = process.env.ASSISTANT_SERVICE_URL || 'http://127.0.0.1:8000';

router.post('/chat', async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    const response = await fetch(`${ASSISTANT_SERVICE_URL}/api/v1/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText || 'Failed to call chat assistant service' });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Error forwarding to chat assistant:', error);
    return res.status(500).json({ error: 'Failed to communicate with chat assistant service. Make sure the python service is running.' });
  }
});

export default router;
