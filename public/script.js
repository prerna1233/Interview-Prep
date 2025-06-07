





// Add pdf.js worker setting at top
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let questions = [];
let answers = [];
let currentIndex = 0;
let mediaRecorder;
let audioChunks = [];

// Handle PDF upload and extract text
document.getElementById('resumeFile').addEventListener('change', async function () {
  const file = this.files[0];
  if (file && file.type === 'application/pdf') {
    const reader = new FileReader();
    reader.onload = async function () {
      const typedarray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(s => s.str).join(' ') + '\n';
      }
      document.getElementById('resume').value = text;
      document.getElementById('resume').classList.remove('hidden');
    };
    reader.readAsArrayBuffer(file);
  } else {
    alert('Please upload a valid PDF file');
  }
});

// Generate questions
document.getElementById("generate").addEventListener("click", async () => {
  const resumeText = document.getElementById("resume").value.trim();
  if (!resumeText) return alert("Please upload or enter a resume.");

  try {
    const response = await fetch("http://localhost:3000/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume: resumeText }),
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const data = await response.json();
    questions = data.questions;
    currentIndex = 0;
    answers = [];
    showQuestion();
  } catch (error) {
    alert("Error fetching questions: " + error.message);
  }
});

function showQuestion() {
  // Skip empty or too short questions
  while (currentIndex < questions.length && questions[currentIndex].trim().length < 10) {
    currentIndex++;
  }

  if (currentIndex >= questions.length) {
    document.getElementById("submitAnswers").classList.remove("hidden");
    document.getElementById("questionBox").classList.add("hidden");
    return;
  }

  document.getElementById("questionBox").classList.remove("hidden");
  document.getElementById("question").textContent = `Q${currentIndex + 1}: ${questions[currentIndex]}`;
  
  // Always show the Next Question button to allow skipping
  document.getElementById("nextQuestion").classList.remove("hidden");

  // Hide previous audio and reset record controls
  document.getElementById("recordedAudio").classList.add("hidden");
  document.getElementById("recordedAudio").src = "";
  document.getElementById("startRecord").classList.remove("hidden");
  document.getElementById("stopRecord").classList.add("hidden");
}



// Start recording audio and speech-to-text
document.getElementById("startRecord").addEventListener("click", async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];

  mediaRecorder.ondataavailable = event => {
    if (event.data.size > 0) {
      audioChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);

    const audioElement = document.getElementById("recordedAudio");
    audioElement.src = audioUrl;
    audioElement.classList.remove("hidden");
    document.getElementById("nextQuestion").classList.remove("hidden");

    // Start speech recognition
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = function (event) {
      const transcript = event.results[0][0].transcript;
      answers.push({
        question: questions[currentIndex],
        answer: transcript,
        audio: audioUrl // Optional: store audio URL
      });
    };

    recognition.onerror = e => alert("Speech recognition error: " + e.error);
    recognition.start();
  };

  mediaRecorder.start();
  document.getElementById("startRecord").classList.add("hidden");
  document.getElementById("stopRecord").classList.remove("hidden");
});

document.getElementById("stopRecord").addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  document.getElementById("stopRecord").classList.add("hidden");
});

// Move to next question
document.getElementById("nextQuestion").addEventListener("click", () => {
  currentIndex++;
  showQuestion();
});

// Submit answers
document.getElementById("submitAnswers").addEventListener("click", async () => {
  try {
    const response = await fetch("http://localhost:3000/evaluate-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const data = await response.json();
    document.getElementById("feedback").textContent = `Score: ${data.score}/10\n\nFeedback:\n${data.feedback}`;
    document.getElementById("feedbackBox").classList.remove("hidden");
  } catch (error) {
    alert("Error submitting answers: " + error.message);
  }
});
