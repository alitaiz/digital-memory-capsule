
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Function to determine port from args, env, or default
const getPort = () => {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex > -1 && process.argv[portArgIndex + 1]) {
    const port = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(port)) return port;
  }
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT, 10);
    if (!isNaN(port)) return port;
  }
  return 8003;
};

const PORT = getPort();

// --- Middleware ---
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // To parse JSON bodies

// --- API Routes ---

// Proxy endpoint for OpenAI API
app.post('/api/rewrite-tribute', async (req, res) => {
  const { text } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key is not configured on the server.' });
  }

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text to rewrite is required.' });
  }

  try {
    const openAIRequestPayload = {
      model: "gpt-4o-mini", // Using the latest cost-effective and powerful model
      messages: [
        {
          role: "system",
          content: "You are a creative and heartfelt writing assistant. A user is writing a story about a happy memory to share with friends or family. Your task is to refine their words to be more vivid, engaging, and touching, while preserving the original sentiment and key details. Return only the rewritten text, without any additional commentary, introductory phrases, or quotation marks."
        },
        {
          role: "user",
          content: `Rewrite the following story about a shared memory to make it more eloquent and heartfelt. Keep the original sentiment and key memories. Here is the original text:\n\n"${text}"`
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    };

    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(openAIRequestPayload)
    });

    if (!openAIResponse.ok) {
        const errorData = await openAIResponse.json().catch(() => ({}));
        console.error("OpenAI API call failed:", errorData);
        const errorMessage = errorData?.error?.message || 'The AI assistant failed to respond.';
        return res.status(openAIResponse.status).json({ error: `AI Assistant Error: ${errorMessage}` });
    }

    const responseData = await openAIResponse.json();
    const rewrittenText = responseData.choices[0].message.content.trim();
    res.json({ rewrittenText });

  } catch (error) {
    console.error('Error proxying to OpenAI:', error);
    res.status(500).json({ error: 'An internal server error occurred while contacting the AI assistant.' });
  }
});

// --- Static File Serving ---
// Serve the built React app from the `dist` directory in the parent folder.
const staticFilesPath = path.join(__dirname, '..', 'dist');
app.use(express.static(staticFilesPath));

// --- Catch-all for Client-Side Routing ---
// For any other GET request, serve the index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(staticFilesPath, 'index.html'));
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
