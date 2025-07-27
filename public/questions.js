// public/questions.js

const allQuestions = JSON.parse(localStorage.getItem("questions") || "[]");

const technical = [];
const soft = [];

const softSkillKeywords = [
  "communication", "team", "adapt", "conflict", "strength", "weakness",
  "pressure", "work with", "challenge", "collaboration", "soft skill", "leadership"
];

allQuestions.forEach(q => {
  const lower = q.toLowerCase();
  if (softSkillKeywords.some(keyword => lower.includes(keyword))) {
    soft.push(q);
  } else {
    technical.push(q);
  }
});

const render = (list, containerId) => {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!list.length) {
    container.innerHTML = "<p>No questions found.</p>";
    return;
  }

  list.forEach((q, i) => {
    const card = document.createElement("div");
    card.className = "question-card";
    card.textContent = `${i + 1}. ${q}`;
    container.appendChild(card);
  });
};

render(technical, "technicalQuestions");
render(soft, "softQuestions");
