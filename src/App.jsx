import React, { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsPDF } from "jspdf";
import { BookOpen, Download, Cpu, AlertCircle, FileText, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isSupportMode, setIsSupportMode] = useState(false); // <--- NEW FEATURE
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState('');

  // --- THE AI ENGINE ---
  const generateActivity = async () => {
    if (!apiKey) {
      setError("Please enter a Google Gemini API Key first.");
      return;
    }
    setLoading(true);
    setError('');
    setActivity(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // DYNAMIC PROMPT LOGIC
      const modeInstructions = isSupportMode
        ? "MODE: SUPPORT/SCAFFOLDING. 1. Simplify all instructions to A2 level. 2. Create 3 MULTIPLE CHOICE options for every question. 3. Add a 'Hint' for the student."
        : "MODE: STANDARD. 1. Use B1/B2 level instructions. 2. Create OPEN-ENDED comprehension questions (no options).";

      const prompt = `
        You are a Master TEFL Lesson Designer.
        Analyze this text: "${transcript}"
        
        TASK: Create a Reading Comprehension activity.
        ${modeInstructions}
        
        STRICT OUTPUT FORMAT:
        Return ONLY valid JSON. No markdown.
        
        JSON STRUCTURE:
        {
          "title": "Creative Title",
          "level": "CEFR Level",
          "duration": "Time",
          "teacher_guide": {
            "rationale": "Why this works...",
            "potential_problems": "Grammar/Vocab warnings..."
          },
          "student_worksheet": {
            "instructions": "Student instructions...",
            "questions": [
              {
                "question_text": "The question?",
                "options": ["Option A", "Option B", "Option C"], // Array of strings if Support Mode, else empty array
                "hint": "Small clue" // Only for Support Mode
              }
            ],
            "glossary": [
              {"word": "Word", "definition": "Def"}
            ]
          }
        }
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;

      let text = response.text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      setActivity(JSON.parse(text));
    } catch (err) {
      console.error(err);
      setError("Error: " + (err.message || "Failed to parse AI response. Try again."));
    } finally {
      setLoading(false);
    }
  };

  // --- THE PDF ENGINE ---
  const downloadPDF = () => {
    if (!activity) return;
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(41, 98, 255);
    doc.text(activity.title, margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${activity.level} | ${activity.duration} | ${isSupportMode ? "Support Version" : "Standard Version"}`, margin, y);
    y += 20;

    // Line
    doc.setLineWidth(0.5);
    doc.setDrawColor(200);
    doc.line(margin, y - 10, 190, y - 10);

    // Student Section
    doc.setTextColor(0);
    doc.setFontSize(16);
    doc.text("Student Worksheet", margin, y);
    y += 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text("Instructions:", margin, y);
    doc.setFont(undefined, 'normal');
    doc.text(activity.student_worksheet.instructions, margin + 30, y, { maxWidth: 140 });
    y += 20;

    activity.student_worksheet.questions.forEach((q, i) => {
      // Check page break
      if (y > 270) { doc.addPage(); y = 20; }

      doc.setFont(undefined, 'bold');
      doc.text(`${i + 1}. ${q.question_text}`, margin, y);
      y += 8;

      doc.setFont(undefined, 'normal');
      // Render Options if they exist (Support Mode)
      if (q.options && q.options.length > 0) {
        q.options.forEach((opt) => {
          doc.text(`   [  ] ${opt}`, margin, y);
          y += 6;
        });
      } else {
        // Render lines for writing (Standard Mode)
        doc.setLineWidth(0.1);
        doc.line(margin, y + 5, 180, y + 5);
        y += 12;
      }
      y += 5;
    });

    // Glossary
    if (y > 250) { doc.addPage(); y = 20; }
    y += 10;
    doc.setFont(undefined, 'bold');
    doc.text("Vocabulary Helper:", margin, y);
    y += 8;
    doc.setFont(undefined, 'normal');

    activity.student_worksheet.glossary.forEach((g) => {
      doc.text(`• ${g.word}: ${g.definition}`, margin, y);
      y += 7;
    });

    doc.save("lesson_plan.pdf");
  };

  // --- THE UI ---
  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <Cpu size={28} />
          <h1>LessonArchitect AI</h1>
        </div>
        <div className="status-badge">v1.1 Differentiated</div>
      </header>

      <main className="main-content">
        {/* CONFIG CARD */}
        <div className="card config-card">
          <div className="input-group">
            <label>Google Gemini API Key</label>
            <input
              type="password"
              placeholder="Paste key (starts with AIza...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Material Transcript</label>
            <textarea
              placeholder="Paste the article, story, or script here..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            ></textarea>
          </div>

          {/* --- NEW TOGGLE SECTION --- */}
          <div
            className="toggle-container"
            onClick={() => setIsSupportMode(!isSupportMode)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              cursor: 'pointer', marginBottom: '20px', padding: '10px',
              background: isSupportMode ? '#eff6ff' : 'transparent',
              borderRadius: '8px', border: isSupportMode ? '1px solid #bfdbfe' : '1px solid transparent'
            }}
          >
            {isSupportMode
              ? <ToggleRight size={40} color="#2563eb" />
              : <ToggleLeft size={40} color="#9ca3af" />
            }
            <div>
              <span style={{ fontWeight: 'bold', display: 'block' }}>Mixed Ability Support</span>
              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                {isSupportMode ? "ON: Multiple choice & simpler vocab (Level A2)" : "OFF: Standard open questions (Level B1)"}
              </span>
            </div>
          </div>
          {/* ------------------------- */}

          <button
            className="generate-btn"
            onClick={generateActivity}
            disabled={loading || !transcript}
          >
            {loading ? "Designing Lesson..." : "Generate Activity"}
          </button>

          {error && <div className="error-msg"><AlertCircle size={16} /> {error}</div>}
        </div>

        {/* RESULTS CARD */}
        {activity && (
          <div className="card result-card">
            <div className="result-header">
              <div>
                <h2>{activity.title}</h2>
                <div className="meta-tags">
                  <span>{activity.level}</span>
                  {isSupportMode && <span style={{ background: '#dbeafe', color: '#1e40af' }}>Scaffolded</span>}
                  <span>{activity.duration}</span>
                </div>
              </div>
              <button onClick={downloadPDF} className="download-btn">
                <Download size={18} /> PDF
              </button>
            </div>

            <div className="teacher-section">
              <h3><CheckCircle size={16} /> Teacher Notes</h3>
              <p>{activity.teacher_guide.rationale}</p>
            </div>

            <div className="student-section">
              <h3><FileText size={16} /> Student Worksheet</h3>
              <p className="instructions"><em>{activity.student_worksheet.instructions}</em></p>

              <ul className="question-list" style={{ listStyle: 'none', padding: 0 }}>
                {activity.student_worksheet.questions.map((q, i) => (
                  <li key={i} style={{ marginBottom: '20px' }}>
                    <strong>{i + 1}. {q.question_text}</strong>

                    {/* Render Options if Support Mode */}
                    {q.options && q.options.length > 0 ? (
                      <div style={{ marginLeft: '15px', marginTop: '5px' }}>
                        {q.options.map((opt, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '8px', margin: '4px 0' }}>
                            <input type="radio" name={`q${i}`} disabled />
                            <label>{opt}</label>
                          </div>
                        ))}
                        {q.hint && <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: '4px' }}>💡 Hint: {q.hint}</div>}
                      </div>
                    ) : (
                      // Render blank line if Standard Mode
                      <div style={{ borderBottom: '1px solid #e5e7eb', height: '30px', marginTop: '5px' }}></div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}