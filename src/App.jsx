import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsPDF } from "jspdf";
import {
  Layout, Download, Sparkles, Trash2,
  Settings, BookOpen, ToggleLeft, ToggleRight,
  FileText, Palette, Printer, Image as ImageIcon
} from 'lucide-react';

// Helper to convert URL to Base64 for PDF embedding
const getBase64FromUrl = async (url) => {
  const data = await fetch(url);
  const blob = await data.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => resolve(reader.result);
  });
};

export default function App() {
  // --- STATE ---
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_key') || '');
  const [transcript, setTranscript] = useState('');
  const [activityType, setActivityType] = useState('comprehension');
  const [cefrLevel, setCefrLevel] = useState('B1');
  const [isScaffolded, setIsScaffolded] = useState(false);
  const [loading, setLoading] = useState(false);

  // The Data
  const [activity, setActivity] = useState(null);
  const [history, setHistory] = useState([]);

  // Visual Assets State
  const [mascotUrl, setMascotUrl] = useState(null);
  const [themeColors, setThemeColors] = useState({ primary: '#4f46e5', accent: '#10b981' });

  // Load History
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('lesson_history') || '[]');
    setHistory(saved);
  }, []);

  // Save Key
  useEffect(() => {
    localStorage.setItem('gemini_key', apiKey);
  }, [apiKey]);

  // --- ACTIONS ---
  const addToHistory = (newActivity, visualData) => {
    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      ...newActivity,
      visuals: visualData
    };
    const updated = [newEntry, ...history];
    setHistory(updated);
    localStorage.setItem('lesson_history', JSON.stringify(updated));
  };

  const loadFromHistory = (item) => {
    setActivity(item);
    if (item.visuals) {
      setMascotUrl(item.visuals.mascotUrl);
      setThemeColors(item.visuals.themeColors);
    }
    if (item.meta) {
      setCefrLevel(item.meta.level);
      setActivityType(item.meta.type);
    }
  };

  const clearHistory = () => {
    if (confirm("Clear all saved lessons?")) {
      setHistory([]);
      localStorage.setItem('lesson_history', '[]');
    }
  };

  // --- AI ENGINE ---
  const generateActivity = async () => {
    if (!apiKey) return alert("Please enter API Key");
    setLoading(true);
    setActivity(null);
    setMascotUrl(null); // Reset image

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      let typePrompt = "";
      switch (activityType) {
        case 'vocabulary': typePrompt = "FOCUS: VOCABULARY. Extract 8-10 difficult words. Create matching questions."; break;
        case 'grammar': typePrompt = "FOCUS: GRAMMAR. Identify tense/structures. Create fill-in-the-blanks."; break;
        case 'true_false': typePrompt = "FOCUS: TRUE/FALSE. Create 10 statements."; break;
        case 'discussion': typePrompt = "FOCUS: SPEAKING. Create discussion prompts."; break;
        default: typePrompt = "FOCUS: COMPREHENSION. Standard open questions.";
      }

      const scaffoldPrompt = isScaffolded
        ? "SCAFFOLDING: ON. Hints, Multiple Choice, Simplified Text."
        : "SCAFFOLDING: OFF. Standard.";

      const prompt = `
        You are a Visual Lesson Architect.
        TEXT: "${transcript}"
        CONFIG: ${typePrompt} | Level: ${cefrLevel} | ${scaffoldPrompt}
        
        TASK:
        1. Create the lesson content.
        2. DESIGN A VISUAL THEME based on the story. 
           - Pick a "primary_color" hex code (e.g. #009246 for Italy).
           - Write a "mascot_prompt": A description for an AI image generator to create a cute header illustration (e.g. "Cartoon pig eating pizza in Rome vector art").
        
        OUTPUT JSON ONLY:
        {
          "title": "Title",
          "meta": { "level": "${cefrLevel}", "type": "${activityType}", "duration": "20m" },
          "visual_theme": {
            "primary_color": "#hexcode",
            "mascot_prompt": "description of illustration"
          },
          "teacher_guide": { "rationale": "...", "key_answers": ["..."] },
          "student_worksheet": {
            "instructions": "...",
            "questions": [
              { "question_text": "...", "options": ["A","B"], "hint": "...", "type": "standard" }
            ],
            "glossary": [{ "word": "...", "definition": "..." }]
          }
        }
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(text);

      setActivity(data);
      setThemeColors({ primary: data.visual_theme.primary_color, accent: '#4b5563' });

      // --- GENERATE IMAGE ---
      // We use Pollinations.ai (Free, No Key) with the prompt from Gemini
      const promptEncoded = encodeURIComponent(data.visual_theme.mascot_prompt + " white background, high quality, vector style, flat illustration");
      const imageUrl = `https://image.pollinations.ai/prompt/${promptEncoded}?width=400&height=400&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

      setMascotUrl(imageUrl);
      addToHistory(data, { mascotUrl: imageUrl, themeColors: { primary: data.visual_theme.primary_color } });

    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ENHANCED PDF ENGINE ---
  const downloadPDF = async () => {
    if (!activity) return;
    const doc = new jsPDF();

    // 1. DESIGN SYSTEM CONSTANTS
    const width = doc.internal.pageSize.getWidth();   // 210mm
    const height = doc.internal.pageSize.getHeight(); // 297mm
    const margin = 15;
    const colWidth = width - (margin * 2);
    const gutter = 10;

    // Theme Management
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
    };
    const primaryRGB = hexToRgb(themeColors.primary);
    const lightBgRGB = [248, 250, 252]; // Very light slate for section backgrounds
    const darkText = [30, 41, 59];      // Slate 800
    const mutedText = [100, 116, 139];  // Slate 500

    // 2. LAYOUT STATE
    let cursorY = 0;
    let pageNumber = 1;

    // 3. DRAWING HELPERS

    // Renders the footer with page number
    const drawFooter = (pNum) => {
      doc.setFillColor(240);
      doc.rect(0, height - 15, width, 15, 'F'); // Light footer bar

      doc.setFontSize(8);
      doc.setTextColor(...mutedText);
      doc.setFont("helvetica", "bold");
      doc.text(`UNIT 1  |  ${activity.meta.type.toUpperCase()}`, margin, height - 6);

      doc.text(`${pNum}`, width - margin, height - 6, { align: 'right' });
    };

    // Helper to draw geometric icons (replaces emojis)
    const drawIcon = (type, x, y, size, color) => {
      doc.setFillColor(...color);
      if (type === 'circle') {
        doc.circle(x + size / 2, y - size / 3, size / 2, 'F');
      } else if (type === 'square') {
        doc.rect(x, y - size + 2, size, size, 'F');
      } else if (type === 'bulb') {
        // Simple bulb icon construction
        doc.circle(x + size / 2, y - size / 2, size / 3, 'F');
        doc.rect(x + size / 3, y - size / 4, size / 3, size / 3, 'F');
      }
    };

    // Checks space and handles pagination
    const checkSpace = (required) => {
      if (cursorY + required > height - 20) {
        drawFooter(pageNumber);
        doc.addPage();
        pageNumber++;
        cursorY = 20; // Reset to top margin
      }
    };

    // --- GENERATION START ---

    // === HEADER SECTION (The "Unit" Banner) ===
    doc.setFillColor(...primaryRGB);
    doc.rect(0, 0, width, 50, 'F'); // Hero background

    // Decorative Pattern (Subtle circles)
    doc.setFillColor(255, 255, 255);
    doc.setGState(new doc.GState({ opacity: 0.1 })); // Transparency
    doc.circle(width - 20, 0, 40, 'F');
    doc.circle(20, 50, 30, 'F');
    doc.setGState(new doc.GState({ opacity: 1.0 })); // Reset

    // Text: Unit & Level
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("LESSON ARCHITECT ELT SERIES", margin, 15);

    doc.setFontSize(26);
    doc.text(activity.title, margin, 28);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`${activity.meta.level} LEVEL  •  ${activity.meta.type.toUpperCase()}`, margin, 38);

    // Mascot Image (Floating Card style)
    if (mascotUrl) {
      try {
        const base64Img = await getBase64FromUrl(mascotUrl);
        // White border card
        doc.setFillColor(255);
        doc.roundedRect(width - 65, 10, 50, 50, 2, 2, 'F');
        doc.addImage(base64Img, 'JPEG', width - 60, 15, 40, 40);
      } catch (e) { console.error(e); }
    }

    cursorY = 70;

    // === STUDENT META ROW ===
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(margin, cursorY, width - margin, cursorY);

    doc.setFontSize(9);
    doc.setTextColor(...mutedText);
    doc.text("Name:", margin, cursorY - 5);
    doc.text("Class Date:", width / 2, cursorY - 5);

    cursorY += 15;

    // === SECTION 1: READING/TEXT ===
    // We treat the instructions/text as the first "Activity Box"
    checkSpace(60);

    // Section Header Badge
    doc.setFillColor(...primaryRGB);
    doc.rect(margin, cursorY, 5, 16, 'F'); // Vertical accent strip
    doc.setTextColor(...primaryRGB);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("1  INSTRUCTIONS & CONTEXT", margin + 10, cursorY + 11);

    cursorY += 25;

    // Grey Box for Instructions
    const instrLines = doc.splitTextToSize(activity.student_worksheet.instructions, colWidth - 10);
    const boxHeight = (instrLines.length * 6) + 20;

    doc.setFillColor(...lightBgRGB);
    doc.roundedRect(margin, cursorY, colWidth, boxHeight, 3, 3, 'F');

    doc.setTextColor(...darkText);
    doc.setFont("helvetica", "italic"); // Italic for instructions
    doc.setFontSize(11);
    doc.text(instrLines, margin + 10, cursorY + 15);

    cursorY += boxHeight + 20;

    // === SECTION 2: EXERCISES ===
    checkSpace(40);

    // Section Header Badge
    doc.setFillColor(...primaryRGB);
    doc.rect(margin, cursorY, 5, 16, 'F');
    doc.setTextColor(...primaryRGB);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("2  EXERCISES", margin + 10, cursorY + 11);

    cursorY += 25;

    // Two-Column Grid Calculation
    const col1X = margin;
    const col2X = (width / 2) + 5;
    const contentW = (width / 2) - margin - 5;

    // Render Questions
    activity.student_worksheet.questions.forEach((q, i) => {
      // Determine layout height
      let qHeight = 25;
      if (q.options) qHeight += (q.options.length * 8);

      checkSpace(qHeight);

      // Question Number (Circle Badge)
      drawIcon('circle', margin, cursorY + 4, 8, primaryRGB);
      doc.setTextColor(255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const numStr = (i + 1).toString();
      doc.text(numStr, margin + 4 - (doc.getTextWidth(numStr) / 2), cursorY + 3);

      // Question Text
      doc.setTextColor(...darkText);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const qTextLines = doc.splitTextToSize(q.question_text, colWidth - 15);
      doc.text(qTextLines, margin + 15, cursorY + 3);

      let currentY = cursorY + (qTextLines.length * 5) + 5;

      // Options
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...darkText);

      if (q.options && q.options.length > 0) {
        // Vertical list of options
        q.options.forEach(opt => {
          doc.setDrawColor(...mutedText);
          doc.rect(margin + 15, currentY - 4, 4, 4); // Checkbox
          doc.text(opt, margin + 25, currentY);
          currentY += 7;
        });
      } else if (activityType === 'true_false') {
        // Horizontal T/F
        doc.setDrawColor(...primaryRGB);
        doc.roundedRect(margin + 15, currentY - 5, 15, 8, 1, 1);
        doc.text("TRUE", margin + 17, currentY);

        doc.roundedRect(margin + 40, currentY - 5, 15, 8, 1, 1);
        doc.text("FALSE", margin + 42, currentY);
        currentY += 10;
      } else {
        // Writing Lines
        doc.setDrawColor(220);
        doc.line(margin + 15, currentY + 5, colWidth + margin, currentY + 5);
        currentY += 12;
      }

      // Scaffolded Hint (Visual Box)
      if (q.hint && isScaffolded) {
        doc.setFillColor(255, 251, 235); // Amber-50
        doc.setDrawColor(251, 191, 36);  // Amber-400

        doc.roundedRect(margin + 15, currentY, colWidth - 15, 10, 2, 2, 'FD');

        // Draw miniature bulb icon instead of emoji
        drawIcon('bulb', margin + 18, currentY + 5, 6, [245, 158, 11]);

        doc.setTextColor(180, 83, 9); // Amber-700
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("HINT:", margin + 26, currentY + 6);

        doc.setFont("helvetica", "normal");
        doc.text(q.hint, margin + 45, currentY + 6);
        currentY += 15;
      }

      cursorY = currentY + 10; // Spacer between questions
    });

    drawFooter(pageNumber);

    // === PAGE 3: TEACHER KEY ===
    doc.addPage();
    pageNumber++;

    // Header
    doc.setFillColor(51, 65, 85); // Slate 700
    doc.rect(0, 0, width, 40, 'F');
    doc.setTextColor(255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TEACHER'S COMPANION", margin, 25);

    cursorY = 60;

    // Content Layout
    doc.setTextColor(...darkText);

    // Block 1: Rationale
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PEDAGOGICAL FOCUS", margin, cursorY);
    cursorY += 8;

    doc.setFont("helvetica", "normal");
    const ratLines = doc.splitTextToSize(activity.teacher_guide.rationale, colWidth);
    doc.text(ratLines, margin, cursorY);
    cursorY += (ratLines.length * 5) + 15;

    // Block 2: Key
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.rect(margin, cursorY, colWidth, 10, 'F'); // Header Bar

    doc.setTextColor(...primaryRGB);
    doc.setFont("helvetica", "bold");
    doc.text("ANSWER KEY", margin + 5, cursorY + 7);
    cursorY += 15;

    if (activity.teacher_guide.key_answers) {
      doc.setTextColor(...darkText);
      doc.setFont("helvetica", "normal");
      activity.teacher_guide.key_answers.forEach((ans, i) => {
        const text = `${i + 1}. ${ans}`;
        doc.text(text, margin + 5, cursorY);
        // Draw subtle checkmark
        doc.setDrawColor(34, 197, 94); // Green
        doc.line(margin, cursorY - 1, margin + 3, cursorY + 1); // Checkmark stroke 1
        doc.line(margin + 3, cursorY + 1, margin + 6, cursorY - 3); // Checkmark stroke 2

        cursorY += 8;
      });
    }

    drawFooter(pageNumber);
    doc.save(`${activity.title.replace(/\s+/g, '_')}_OxfordStyle.pdf`);
  };
  // --- UI RENDER ---
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><Layout /> LessonArchitect</div>
        <div className="input-group" style={{ marginBottom: '20px' }}>
          <label style={{ color: '#a5b4fc' }}>API Key</label>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid #4338ca' }} />
        </div>
        <div className="history-list">
          <div style={{ color: '#a5b4fc', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '10px' }}>HISTORY</div>
          {history.map(item => (
            <div key={item.id} className="history-item" onClick={() => loadFromHistory(item)}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {item.visuals?.mascotUrl && <img src={item.visuals.mascotUrl} style={{ width: '30px', height: '30px', borderRadius: '4px', objectFit: 'cover' }} />}
                <div>
                  <span className="history-title">{item.title}</span>
                  <div className="history-meta">{item.meta?.level}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={clearHistory} style={{ marginTop: 'auto', background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'center' }}><Trash2 size={14} /> Clear History</button>
      </aside>

      <main className="workspace">
        <div className="editor-panel">
          <h2><Sparkles size={20} style={{ display: 'inline', color: themeColors.primary }} /> Creator Studio</h2>

          <div className="input-group">
            <label>Story / Topic</label>
            <textarea
              placeholder="e.g. Peppa Pig goes to Italy and eats pizza..."
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="input-group">
              <label>Type</label>
              <select value={activityType} onChange={e => setActivityType(e.target.value)}>
                <option value="comprehension">Comprehension</option>
                <option value="vocabulary">Vocabulary</option>
                <option value="grammar">Grammar</option>
                <option value="discussion">Discussion</option>
              </select>
            </div>
            <div className="input-group">
              <label>Level</label>
              <select value={cefrLevel} onChange={e => setCefrLevel(e.target.value)}>
                <option>A1</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option>
              </select>
            </div>
          </div>

          <div className={`toggle-box ${isScaffolded ? 'active' : ''}`} onClick={() => setIsScaffolded(!isScaffolded)}>
            {isScaffolded ? <ToggleRight color={themeColors.primary} /> : <ToggleLeft color="#ccc" />}
            <span>Scaffolding Mode</span>
          </div>

          <button className="generate-btn" onClick={generateActivity} disabled={loading} style={{ background: themeColors.primary }}>
            {loading ? "Designing & Illustrating..." : "Generate Magic Lesson"}
          </button>
        </div>

        <div className="preview-panel" style={{ background: '#f0f9ff' }}>
          {activity ? (
            <div className="paper">
              {/* VISUAL HEADER PREVIEW */}
              <div style={{
                background: themeColors.primary,
                padding: '20px', borderRadius: '8px 8px 0 0',
                color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ flex: 1 }}>
                  <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{activity.title}</h1>
                  <div style={{ opacity: 0.8, fontSize: '0.9rem' }}>{activity.meta.level} • {activity.meta.type.toUpperCase()}</div>
                </div>
                {mascotUrl && (
                  <img src={mascotUrl} alt="Mascot" style={{ width: '80px', height: '80px', borderRadius: '8px', border: '2px solid white', objectFit: 'cover' }} />
                )}
              </div>

              <div style={{ padding: '30px' }}>
                <button onClick={downloadPDF} className="download-btn" style={{ width: '100%', marginBottom: '20px', background: '#1f2937' }}>
                  <Printer size={18} /> Download Illustrated PDF
                </button>

                <div style={{ background: '#f9fafb', padding: '15px', borderRadius: '8px', borderLeft: `4px solid ${themeColors.primary}` }}>
                  <strong>Instructions:</strong> {activity.student_worksheet.instructions}
                </div>

                <div style={{ marginTop: '30px' }}>
                  {activity.student_worksheet.questions.map((q, i) => (
                    <div key={i} style={{ marginBottom: '15px', borderBottom: '1px dashed #eee', paddingBottom: '10px' }}>
                      <div style={{ fontWeight: 'bold', color: themeColors.primary }}>{i + 1}. {q.question_text}</div>
                      {q.options && q.options.map(opt => <div key={opt} style={{ marginLeft: '10px', fontSize: '0.9rem' }}>○ {opt}</div>)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', opacity: 0.3, marginTop: '100px' }}>
              <Palette size={64} />
              <h3>Visual Engine Ready</h3>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}