# Interview Prep with Gemini AI

This project provides a full-stack interview preparation tool using Google Gemini Generative AI and a simple Express backend.

## Features

- Upload and extract text from a PDF resume using PDF.js
- Generate interview questions based on your resume via `/generate-questions` endpoint
- Conduct voice-recorded answers and evaluate them via `/evaluate-answers` endpoint
- Static front-end served from Express `public/` directory

## Setup

1. Create a `.env` file in the project root with your Gemini API key:
   ```properties
   GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Start the server:
   ```powershell
   npm start
   ```
4. Open your browser:
   - If using Live Server (port 5500), the front-end will run there but API requests must target `http://localhost:3000`
   - Or navigate to `http://localhost:3000` to serve both front-end and API from the same origin.

## Code Changes Summary

### server.js
- Added `require('dotenv').config()` to load `GEMINI_API_KEY`.
- Configured Express to serve static files from `public/`:
  ```js
  app.use(express.static(path.join(__dirname, 'public')));
  ```
- Implemented `/generate-questions` POST endpoint to generate questions from resume text.
- Retained `/evaluate-answers` POST endpoint to score and provide feedback on answers.

### public/script.js
- Initial fetch calls pointed to `http://localhost:3000` to avoid CORS issues when using Live Server.
- Extracted resume text from uploaded PDF and displayed it in a textarea.
- Handled question display and voice-based answer capture.

## Usage

1. Upload your resume PDF.
2. Click **Generate Interview Questions**.
3. Record your answers via the **Start Recording Answer** button.
4. Submit answers for evaluation and view score/feedback.

---

Feel free to customize and extend this base for more robust scoring, authentication, or UI enhancements!
