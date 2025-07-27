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

document.getElementById("generate").addEventListener("click", async () => {
  const resumeText = document.getElementById("resume").value.trim();
  const numQuestions = parseInt(document.getElementById("numQuestions").value, 10) || 10;
  if (!resumeText) return alert("Please upload or enter a resume.");

  showLoading(true);

  try {
    const response = await fetch("https://interview-prep-3-9lbw.onrender.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume: resumeText, numQuestions }),
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const data = await response.json();
    questions = data.questions.slice(0, numQuestions); // Only use the requested number
    currentIndex = 0;
    answers = [];
    showQuestion();
  } catch (error) {
    alert("Error fetching questions: " + error.message);
  } finally {
    showLoading(false);
  }
});

function showLoading(show) {
  const overlay = document.getElementById('loadingOverlay');
  if (show) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}


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
  document.getElementById("nextQuestion").classList.remove("hidden");
  document.getElementById("recordedAudio").classList.add("hidden");
  document.getElementById("recordedAudio").src = "";
  document.getElementById("startRecord").classList.remove("hidden");
  document.getElementById("stopRecord").classList.add("hidden");

  // Clear text answer input
  const textAnswerInput = document.getElementById("textAnswer");
  textAnswerInput.value = "";

  // Hide submit button if already answered
  if (answers[currentIndex]) {
    document.getElementById("submitTextAnswer").style.display = "none";
    textAnswerInput.disabled = true;
    textAnswerInput.value = "Submitted";
  } else {
    document.getElementById("submitTextAnswer").style.display = "inline-block";
    textAnswerInput.disabled = false;
  }
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

// Text answer submission
const textAnswerInput = document.getElementById("textAnswer");
document.getElementById("submitTextAnswer").addEventListener("click", () => {
  const text = textAnswerInput.value.trim();
  if (!text) {
    alert("Please type your answer before submitting.");
    return;
  }
  answers[currentIndex] = {
    question: questions[currentIndex],
    answer: text,
    audio: null
  };
  textAnswerInput.value = "Submitted";
  textAnswerInput.disabled = true;
  document.getElementById("submitTextAnswer").style.display = "none";
  document.getElementById("nextQuestion").classList.remove("hidden");
});

// Submit answers
document.getElementById("submitAnswers").addEventListener("click", async () => {
  const feedbackSpinner = document.getElementById("feedback-spinner");
  const feedbackBox = document.getElementById("feedbackBox");
  const feedbackDiv = document.getElementById("feedback");
  feedbackBox.classList.remove("hidden");
  feedbackSpinner.classList.remove("hidden");
  feedbackDiv.textContent = "";
  try {
    const response = await fetch("https://interview-prep-3-9lbw.onrender.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const data = await response.json();
    feedbackDiv.textContent = `Score: ${data.score}/10\n\nFeedback:\n${data.feedback}`;
  } catch (error) {
    feedbackDiv.textContent = "Error submitting answers: " + error.message;
  } finally {
    feedbackSpinner.classList.add("hidden");
  }
});





