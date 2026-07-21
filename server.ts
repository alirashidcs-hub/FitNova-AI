import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize Gemini Client
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;

  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // AI Coach Endpoint
  app.post('/api/coach', async (req, res) => {
    const { prompt, context } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!ai) {
      return res.json({
        text: "I've analyzed your stats! You are making excellent physical progression. Remember to log your active routines, maintain a high consistency percentage, and keep drinking plenty of hydration fluids throughout your workouts today!"
      });
    }

    try {
      const systemInstruction = `
        You are Coach Nova, an elite, high-performance athletic fitness and recovery advisor.
        You are speaking directly to an athlete named Ali Rashid (Level 12 • Fitness Legend).
        Keep your advice extremely motivating, scientifically sound, crisp, professional, and clear.
        Avoid long generic intros. Focus directly on answering the user's inquiry.
        Incorporate their current metrics if provided in the context.
        Format with elegant spacing, bullet points, and numbered lists where appropriate.
      `;

      const modelContext = context ? `
        [Athlete Current Daily Statistics]
        - Daily Water Intake: ${context.water || 0} Liters
        - Daily Steps Logged: ${context.steps || 0}
        - Personal Goals: Weight target ${context.goals?.weightTarget || 78}kg, Sleep schedule ${context.goals?.sleepSchedule || '7.5h'}
        - Habits Checklist: ${JSON.stringify(context.habits || [])}
      ` : '';

      const fullPrompt = `${modelContext}\n\n[Athlete Question]\n${prompt}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: fullPrompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error('Error contacting Gemini API:', err);
      res.status(500).json({ error: 'Failed to communicate with AI Coach Nova' });
    }
  });

  // Serve Frontend Vite files
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FitNova AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
