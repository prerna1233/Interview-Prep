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
//  const prompt = `
// You are an expert interviewer.

// Task:
// Generate an interview script based on the candidate's resume provided below. The script should:
//  Start with a brief friendly **introduction and welcome**.
// 2. Ask **technical questions** one by one based on the resume's skills, technologies, and projects.
// 3. Then move to **soft skill questions** such as communication, problem-solving, adaptability, teamwork, etc.
// 4. After **each question**, mention clearly: "⏺️ Please record your answer now before proceeding."
// 5. After the final question, say: "✅ Thank you! Your answers will now be evaluated."

// After all responses are received, the system will evaluate the answers and:
// - Give a **score out of 10**.
// - Provide **constructive feedback** highlighting strengths and improvement areas.

// Candidate Resume:
// =================
// ${resume}
// `;

const prompt = `
You are an expert interviewer.

Task:
Read the candidate's resume below. Generate a list of **interview questions only** (no instructions or introductions).

Instructions:
- ONLY provide interview questions. Each question must be a complete sentence and end with a question mark (?).
- DO NOT include any greetings, introductions, or closing statements.
- DO NOT include sentences like "Please record your answer" or "Good luck".
- ONLY return direct **interview questions**.

- Questions should be divided into:
   🔧 Technical Questions (based on skills/projects)
   💬 Soft Skill Questions (communication, teamwork, etc.)

Return format (use exactly this):
---
Technical Questions:
1. ...
2. ...
...

Soft Skill Questions:
1. ...
2. ...
...

Resume:
========================
${resume}
`;


await new Promise(resolve => setTimeout(resolve, 3000));

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
   const questions = text
  .split('\n')
  .map(line => line.trim())
  .filter(line => {
    const lower = line.toLowerCase();
    return (
      line.length > 10 &&
      line.endsWith('?') &&
      !lower.includes("please record") &&
      !lower.includes("record your answer") &&
      !lower.includes("thank you") &&
      !lower.includes("good luck") &&
      !lower.includes("✅") &&
      !lower.includes("⏺️") &&
      !lower.includes("your answers will be evaluated") &&
      !lower.startsWith("introduction") &&
      !lower.startsWith("q:") &&
      !lower.startsWith("a:") &&
      !lower.startsWith("okay") &&
      !lower.includes("interview script") &&
      !lower.includes("before proceeding")
    );
  })
  .map(q => q.replace(/^(\d+[\.\)]|\-|\*|\–)\s*/, '').trim())
  .filter(q => q.length > 0);
console.log("Filtered questions:\n", questions);
console.log("Filtered questions:", questions);
res.json({ questions });



  } catch (err) {
    console.error('Error generating questions:', err);
    res.status(500).json({ error: 'Error generating questions' });
  }
});

// ...existing code...

app.post('/evaluate-answers', async (req, res) => {
  const { answers } = req.body;

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Answers are required' });
  }

  try {
    const formattedAnswers = answers.map((a, i) => `${i + 1}. Q: ${a.question}\nA: ${a.answer}`).join('\n\n');
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });

    const prompt = `
You are a strict technical interviewer evaluating a candidate's answers.

Instructions:
- For each answer, give a score out of 10.
- If the answer is blank, missing, or completely irrelevant, give a score of 0 or 1.
- If the answer is partially correct or incomplete, give a score between 2 and 6.
- Only give a high score (7-10) for complete, relevant, and well-explained answers.
- After scoring, provide specific, constructive feedback for each answer, mentioning what was good and what needs improvement.
- Be honest and do not inflate scores.

Format your response as:
Score: <number out of 10>
Feedback: <your feedback here>

Candidate's answers:
${formattedAnswers}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();

    // Try to extract score from the LLM response
    const scoreMatch = text.match(/Score:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

    res.json({
      score: score !== null ? score : 0,
      feedback: text
    });
  } catch (err) {
    console.error('Error evaluating answers:', err);
    res.status(500).json({ error: 'Error evaluating answers' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});

