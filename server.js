











import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/generate-questions', async (req, res) => {
  const { resume } = req.body;
  if (!resume) {
    return res.status(400).json({ error: 'Resume text is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash' });
    // const prompt = `You are an expert interviewer. Generate structured interview questions based on this resume:\n\n${resume}`;
 const prompt = `
You are an expert interviewer.

Task:
Generate an interview script based on the candidate's resume provided below. The script should:
1. Start with a brief friendly **introduction and welcome**.
2. Ask **technical questions** one by one based on the resume's skills, technologies, and projects.
3. Then move to **soft skill questions** such as communication, problem-solving, adaptability, teamwork, etc.
4. After **each question**, mention clearly: "⏺️ Please record your answer now before proceeding."
5. After the final question, say: "✅ Thank you! Your answers will now be evaluated."

After all responses are received, the system will evaluate the answers and:
- Give a **score out of 10**.
- Provide **constructive feedback** highlighting strengths and improvement areas.

Candidate Resume:
=================
${resume}
`;


    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    const questions = text
      .split('\n')
      .map(q => q.replace(/^\d+\.\s*/, '').trim())
      .filter(q => q);
    res.json({ questions });
  } catch (err) {
    console.error('Error generating questions:', err);
    res.status(500).json({ error: 'Error generating questions' });
  }
});

app.post('/evaluate-answers', async (req, res) => {
  const { answers } = req.body;

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Answers are required' });
  }

  try {
    const formattedAnswers = answers.map((a, i) => `${i + 1}. Q: ${a.question}\nA: ${a.answer}`).join('\n\n');
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });
    const prompt = `Evaluate the following interview answers and give a score out of 10 with feedback:\n\n${formattedAnswers}`;
    // const result = await model.generateContent(prompt);
    // const response = await result.response;

const result = await model.generateContent(prompt);
const response = await result.response;
const text = await response.text();
const lines = text.split('\n');



// res.json({ questions });

    const feedback = await response.text();
    res.json({ score: 8, feedback });
  } catch (err) {
    console.error('Error evaluating answers:', err);
    res.status(500).json({ error: 'Error evaluating answers' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});

