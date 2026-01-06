import React, { useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsPDF } from "jspdf";
import { BookOpen, Download, Layout, AlertCircle, FileText, CheckCircle, Settings, ToggleLeft, ToggleRight } from 'lucide-react';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [transcript, setTranscript] = useState('');
  const [activityType, setActivityType] = useState('comprehension');
  const [cefrLevel, setCefrLevel] = useState('B1');
  const [isScaffolded, setIsScaffolded] = useState(false);
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
      // ✅ USING THE WORKING MODEL (Gemini 2.5)
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // 1. BUILD ACTIVITY PROMPT
      let typePrompt = "";
      switch (activityType) {
        case 'vocabulary':
          typePrompt = "FOCUS: VOCABULARY. Extract 8-10 difficult words. Create matching questions or Fill-in-the-blanks.";
          break;
        case 'grammar':
          typePrompt = "FOCUS: GRAMMAR. Identify the main tense. Create exercises to fix sentences or fill in verbs.";
          break;
        case 'true_false':
          typePrompt = "FOCUS: RAPID CHECK. Create 10 True/False statements.";
          break;
        case 'discussion':
          typePrompt = "FOCUS: SPEAKING. Create discussion questions with 'For/Against' arguments.";
          break;
        default:
          typePrompt = "FOCUS: READING COMPREHENSION. Create standard open-ended questions.";
      }

      // 2. BUILD SCAFFOLD PROMPT
      const scaffoldPrompt = isScaffolded
        ? "SCAFFOLDING: ON. 1. Add a 'Hint' for every question. 2. Provide Multiple Choice options. 3. Simplify text."
        : "SCAFFOLDING: OFF. Standard format.";

      const prompt = `
        You are an expert TEFL Lesson Designer.
        SOURCE TEXT: "${transcript}"
        
        TASK CONFIGURATION:
        - Activity: ${typePrompt}
        - Level: ${cefrLevel} (Strictly adhere to this CEFR level)
        - ${scaffoldPrompt}
        
        STRICT OUTPUT FORMAT (JSON ONLY):
        {
          "title": "Creative Title",
          "meta": { "level": "${cefrLevel}", "type": "${activityType}", "duration": "20 mins" },
          "teacher_guide": {
            "rationale": "Rationale...",
            "key_answers": ["1. A", "2. B"] 
          },
          "student_worksheet": {
            "instructions": "Clear instructions...",
            "questions": [
              {
                "question_text": "Question?",
                "options": ["A", "B"], 
                "hint": "Clue",
                "type": "standard"
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
      setError("Error: " + (err.message || "Failed to generate. Try again."));
    } finally {
      setLoading(false);
    }
  };

  // --- UNIVERSAL DESIGN PDF ENGINE ---
  const downloadPDF = () => {
    if (!activity) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = 0;

    // Helper: Footer
    const drawFooter = (pageNo) => {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${pageNo} | Created with LessonArchitect AI`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    };

    // Helper: Page Break
    let pageCount = 1;
    const checkPageBreak = (spaceNeeded) => {
      if (y + spaceNeeded > pageHeight - margin) {
        drawFooter(pageCount);
        doc.addPage();
        pageCount++;
        y = 20;
      }
    };

    // --- HEADER ---
    doc.setFillColor(79, 70, 229); // Professional Indigo
    doc.rect(0, 0, pageWidth, 20, 'F'); // Top Bar
    y = 35;

    // --- METADATA FIELDS (Universal Design) ---
    doc.setFontSize(10);
    doc.setTextColor(50);
    doc.text("Name: ____________________________", margin, y);
    doc.text("Date: _________________", pageWidth - margin - 40, y);
    y += 15;

    // --- TITLE BLOCK ---
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(30);
    const titleLines = doc.splitTextToSize(activity.title, pageWidth - (margin * 2));
    doc.text(titleLines, margin, y);
    y += (titleLines.length * 10);

    // Meta Tags
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(100);
    doc.text(`${activity.meta.level}  |  ${activity.meta.type.toUpperCase()}  |  ${activity.meta.duration}`, margin, y);
    y += 10;

    // Divider
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    // --- INSTRUCTIONS ---
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text("Instructions:", margin, y);
    y += 7;
    doc.setFont(undefined, 'normal');
    const instLines = doc.splitTextToSize(activity.student_worksheet.instructions, pageWidth - (margin * 2));
    doc.text(instLines, margin, y);
    y += (instLines.length * 6) + 10;

    // --- QUESTIONS ---
    activity.student_worksheet.questions.forEach((q, i) => {
      let spaceNeeded = 30; // Base space estimate
      if (q.options && q.options.length > 0) spaceNeeded += (q.options.length * 8);
      checkPageBreak(spaceNeeded);

      doc.setFont(undefined, 'bold');
      doc.text(`${i + 1}.`, margin, y);

      doc.setFont(undefined, 'normal');
      const qTextLines = doc.splitTextToSize(q.question_text, pageWidth - margin - 30);
      doc.text(qTextLines, margin + 10, y);
      y += (qTextLines.length * 6) + 2;

      // Render Options (Multiple Choice)
      if (q.options && q.options.length > 0) {
        q.options.forEach((opt) => {
          doc.text(`[   ]  ${opt}`, margin + 15, y);
          y += 7;
        });
      }
      // Render True/False
      else if (activityType === 'true_false') {
        doc.rect(margin + 15, y, 12, 6);
        doc.text("True", margin + 30, y + 4.5);
        doc.rect(margin + 60, y, 12, 6);
        doc.text("False", margin + 75, y + 4.5);
        y += 10;
      }
      // Render Writing Lines (Universal)
      else {
        doc.setDrawColor(220); // Light grey lines
        doc.line(margin + 10, y + 7, pageWidth - margin, y + 7);
        doc.line(margin + 10, y + 15, pageWidth - margin, y + 15);
        y += 20;
      }

      // Hint (Scaffolded)
      if (q.hint && isScaffolded) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`💡 Hint: ${q.hint}`, margin + 15, y - 2);
        doc.setTextColor(0);
        doc.setFontSize(12);
      }
      y += 5;
    });

    // --- GLOSSARY BOX ---
    if (activity.student_worksheet.glossary.length > 0) {
      checkPageBreak(60);
      y += 5;
      doc.setFillColor(248, 250, 252); // Very light grey bg
      doc.setDrawColor(226, 232, 240); // Border color
      const boxHeight = (activity.student_worksheet.glossary.length * 8) + 20;
      doc.rect(margin, y, pageWidth - (margin * 2), boxHeight, 'FD'); // Fill and Draw

      y += 10;
      doc.setFont(undefined, 'bold');
      doc.text("Vocabulary Bank", margin + 5, y);
      y += 8;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);

      activity.student_worksheet.glossary.forEach((g) => {
        doc.text(`• ${g.word}: ${g.definition}`, margin + 5, y);
        y += 7;
      });
    }

    drawFooter(pageCount);
    doc.save(`${activity.title.replace(/\s+/g, '_')}_Worksheet.pdf`);
  };

  // --- THE UI ---
  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <Layout size={28} />
          <h1>LessonArchitect AI <span className="version">Universal</span></h1>
        </div>
      </header>

      <main className="main-content">
        {/* CONFIG CARD */}
        <div className="card config-card">
          <div className="input-group">
            <label>API Key</label>
            <input
              type="password"
              placeholder="Paste Google AI Key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Source Text</label>
            <textarea
              placeholder="Paste article, story, or transcript..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            ></textarea>
          </div>

          <div className="control-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div className="input-group">
              <label><Settings size={14} /> Activity Type</label>
              <select value={activityType} onChange={(e) => setActivityType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                <option value="comprehension">Reading Comprehension</option>
                <option value="vocabulary">Vocabulary Drill</option>
                <option value="grammar">Grammar Practice</option>
                <option value="true_false">True / False Challenge</option>
                <option value="discussion">Discussion Questions</option>
              </select>
            </div>

            <div className="input-group">
              <label><BookOpen size={14} /> CEFR Level</label>
              <select value={cefrLevel} onChange={(e) => setCefrLevel(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}>
                <option value="A1">A1 (Beginner)</option>
                <option value="A2">A2 (Elementary)</option>
                <option value="B1">B1 (Intermediate)</option>
                <option value="B2">B2 (Upper Int)</option>
                <option value="C1">C1 (Advanced)</option>
              </select>
            </div>
          </div>

          <div
            className="toggle-container"
            onClick={() => setIsScaffolded(!isScaffolded)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              cursor: 'pointer', marginBottom: '20px', padding: '12px',
              background: isScaffolded ? '#f0fdf4' : '#f9fafb',
              borderRadius: '8px', border: isScaffolded ? '1px solid #86efac' : '1px solid #e5e7eb'
            }}
          >
            {isScaffolded ? <ToggleRight size={40} color="#16a34a" /> : <ToggleLeft size={40} color="#9ca3af" />}
            <div>
              <span style={{ fontWeight: 'bold', display: 'block', color: isScaffolded ? '#15803d' : '#374151' }}>Scaffolding Mode</span>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {isScaffolded ? "ON: Hints, Options, Simplified Text" : "OFF: Standard Output"}
              </span>
            </div>
          </div>

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
                  <span className="tag-level">{activity.meta.level}</span>
                  <span className="tag-type">{activity.meta.type}</span>
                </div>
              </div>
              <button onClick={downloadPDF} className="download-btn">
                <Download size={18} /> Download Worksheet
              </button>
            </div>

            <div className="teacher-section">
              <h3><CheckCircle size={16} /> Teacher Guide</h3>
              <p><strong>Rationale:</strong> {activity.teacher_guide.rationale}</p>
              {activity.teacher_guide.key_answers && (
                <div style={{ marginTop: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '5px', fontSize: '0.9rem' }}>
                  <strong>Answer Key:</strong> {activity.teacher_guide.key_answers.join(' | ')}
                </div>
              )}
            </div>

            <div className="student-section">
              <h3><FileText size={16} /> Worksheet Preview</h3>
              <p className="instructions"><em>{activity.student_worksheet.instructions}</em></p>
              <ul className="question-list">
                {activity.student_worksheet.questions.map((q, i) => (
                  <li key={i} style={{ marginBottom: '10px' }}>
                    <strong>{i + 1}.</strong> {q.question_text}
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