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

  // --- MODERN CLEAN PDF ENGINE ---
  const downloadPDF = async () => {
    if (!activity) return;
    const doc = new jsPDF();

    // 1. DESIGN CONFIG
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentW = width - (margin * 2);

    // Modern Color Palette
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
    };
    const primaryRGB = hexToRgb(themeColors.primary);
    const slate800 = [30, 41, 59];
    const slate500 = [100, 116, 139];
    const slate50 = [248, 250, 252];
    const slate200 = [226, 232, 240];

    // 2. STATE
    let cursorY = 0;
    let pageNumber = 1;

    // 3. HELPERS
    const drawFooter = (pNum) => {
      doc.setFontSize(8);
      doc.setTextColor(...slate500);
      doc.setFont("helvetica", "normal");
      doc.text(`Page ${pNum}  •  ${activity.title}`, width - margin, height - 10, { align: 'right' });

      // Decorative bottom accent
      doc.setDrawColor(...primaryRGB);
      doc.setLineWidth(1);
      doc.line(margin, height - 15, width - margin, height - 15);
    };

    const checkSpace = (required) => {
      if (cursorY + required > height - 20) {
        drawFooter(pageNumber);
        doc.addPage();
        pageNumber++;
        cursorY = 20;
      }
    };

    // --- RENDER START ---

    // === 1. MODERN HEADER ===
    // Primary Sidebar Strip
    doc.setFillColor(...primaryRGB);
    doc.rect(0, 0, 8, height, 'F');

    // Title Block
    cursorY = 20;
    doc.setTextColor(...primaryRGB);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("ENGLISH LEARNING SERIES", margin + 5, cursorY);

    cursorY += 10;
    doc.setTextColor(...slate800);
    doc.setFontSize(24);
    doc.text(activity.title, margin + 5, cursorY);

    // Meta Tags (Pill style)
    cursorY += 8;
    const drawPill = (text, x) => {
      doc.setDrawColor(...slate200);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, cursorY, doc.getTextWidth(text) + 10, 7, 3, 3, 'FD');
      doc.setTextColor(...slate500);
      doc.setFontSize(8);
      doc.text(text, x + 5, cursorY + 4.5);
      return x + doc.getTextWidth(text) + 15;
    };

    let pillQX = margin + 5;
    pillQX = drawPill(activity.meta.level, pillQX);
    pillQX = drawPill(activity.meta.type.toUpperCase(), pillQX);
    pillQX = drawPill("20 MIN", pillQX);

    // Mascot
    if (mascotUrl) {
      try {
        const base64Img = await getBase64FromUrl(mascotUrl);
        doc.addImage(base64Img, 'JPEG', width - 50, 15, 35, 35);
      } catch (e) { console.error(e); }
    }

    cursorY += 20;

    // === 2. STUDENT FIELDS ===
    doc.setDrawColor(...slate200);
    doc.line(margin + 5, cursorY, width - margin, cursorY);
    cursorY += 10;

    doc.setFontSize(10);
    doc.setTextColor(...slate500);
    doc.text("Name: ______________________", margin + 5, cursorY);
    doc.text("Date: ______________________", width / 2, cursorY);

    cursorY += 15;

    // === 3. INSTRUCTIONS (Featured Box) ===
    checkSpace(30);
    doc.setFillColor(...slate50);
    doc.setDrawColor(...primaryRGB);
    doc.setLineWidth(0.5);

    // Calculate height
    const instrLines = doc.splitTextToSize(activity.student_worksheet.instructions, contentW - 20);
    const instrH = (instrLines.length * 5) + 15;

    doc.roundedRect(margin + 5, cursorY, contentW - 5, instrH, 2, 2, 'FD');

    // "Icon" Circle
    doc.setFillColor(...primaryRGB);
    doc.circle(margin + 15, cursorY + 10, 3, 'F');

    doc.setTextColor(...slate800);
    doc.setFont("helvetica", "bold");
    doc.text("INSTRUCTIONS", margin + 22, cursorY + 11);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...slate500);
    doc.text(instrLines, margin + 22, cursorY + 19);

    cursorY += instrH + 15;

    // === 4. QUESTIONS (Card Style) ===
    activity.student_worksheet.questions.forEach((q, i) => {
      // Calculate Question Card Height
      let cardH = 20; // Base padding
      const qLines = doc.splitTextToSize(q.question_text, contentW - 30);
      cardH += qLines.length * 6;

      // Options Height
      let hasOptions = false;
      if (q.options && q.options.length > 0) {
        hasOptions = true;
        // Check if options fit on one line (Horizontal Grid)
        const totalOptLen = q.options.join('').length;
        cardH += (totalOptLen < 50) ? 10 : (q.options.length * 7);
      } else if (activityType === 'true_false') {
        cardH += 10;
      } else {
        cardH += 15; // Writing space
      }

      // Hint Height
      if (q.hint && isScaffolded) cardH += 12;

      checkSpace(cardH + 5);

      // Draw Card Container
      // Use very light border for definition, no fill to keep it clean
      doc.setDrawColor(...slate200);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin + 5, cursorY, contentW - 5, cardH, 3, 3);

      // Question Number (Accent Box)
      doc.setFillColor(...primaryRGB);
      doc.path([
        { op: 'm', c: [margin + 5, cursorY + 3] }, // Start top-left radius
        { op: 'l', c: [margin + 5, cursorY + 12] },
        { op: 'l', c: [margin + 12, cursorY + 12] },
        { op: 'l', c: [margin + 12, cursorY + 3] },
        { op: 'c', c: [margin + 12, cursorY, margin + 5, cursorY, margin + 5, cursorY + 3] } // Close with radius
      ]);
      doc.fill();

      doc.setTextColor(255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text((i + 1).toString(), margin + 8.5, cursorY + 9, { align: 'center' });

      // Question Text
      doc.setTextColor(...slate800);
      doc.setFontSize(11);
      doc.text(qLines, margin + 18, cursorY + 9);

      let localY = cursorY + 12 + (qLines.length * 5);

      // Render Options
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...slate500);

      if (hasOptions) {
        const totalOptLen = q.options.join('').length;

        if (totalOptLen < 50) {
          // Horizontal Layout
          let optX = margin + 18;
          q.options.forEach(opt => {
            // Circle Checkbox
            doc.setDrawColor(...slate200);
            doc.circle(optX + 2, localY - 1, 2.5);
            doc.text(opt, optX + 8, localY);
            optX += doc.getTextWidth(opt) + 20;
          });
          localY += 10;
        } else {
          // Vertical Layout
          q.options.forEach(opt => {
            doc.setDrawColor(...slate200);
            doc.circle(margin + 20, localY - 1, 2.5);
            doc.text(opt, margin + 26, localY);
            localY += 7;
          });
        }
      } else if (activityType === 'true_false') {
        doc.text("TRUE     /     FALSE", margin + 18, localY);
        localY += 10;
      } else {
        doc.setDrawColor(...slate200);
        doc.line(margin + 18, localY + 5, width - margin - 10, localY + 5);
        localY += 15;
      }

      // Integrated Footer Hint
      if (q.hint && isScaffolded) {
        doc.setDrawColor(...slate200);
        doc.line(margin + 5, localY - 3, width - margin, localY - 3); // Separator line inside card

        doc.setFillColor(255, 251, 235); // Amber-50 bg
        doc.rect(margin + 6, localY - 2, contentW - 7, cardH - (localY - cursorY) + 1, 'F'); // Fill bottom of card

        doc.setFontSize(9);
        doc.setTextColor(180, 83, 9); // Amber-700
        doc.setFont("helvetica", "bold");
        doc.text("HINT:", margin + 15, localY + 5);

        doc.setFont("helvetica", "italic");
        doc.text(q.hint, margin + 28, localY + 5);
      }

      cursorY += cardH + 8; // Spacing between cards
    });

    drawFooter(pageNumber);

    // === 5. TEACHER'S GUIDE ===
    doc.addPage();
    pageNumber++;

    // Sidebar for Teacher Page
    doc.setFillColor(51, 65, 85); // Slate 700
    doc.rect(0, 0, 8, height, 'F');

    cursorY = 20;
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("TEACHER'S COMPANION", margin + 5, cursorY);

    // Rationale Box
    cursorY += 15;
    doc.setFillColor(...slate50);
    doc.roundedRect(margin + 5, cursorY, contentW - 5, 40, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setTextColor(...primaryRGB);
    doc.text("PEDAGOGICAL FOCUS", margin + 10, cursorY + 10);

    doc.setTextColor(...slate500);
    doc.setFont("helvetica", "normal");
    const ratLines = doc.splitTextToSize(activity.teacher_guide.rationale, contentW - 20);
    doc.text(ratLines, margin + 10, cursorY + 18);

    cursorY += 50;

    // Answer Key Table
    doc.setTextColor(...slate800);
    doc.setFont("helvetica", "bold");
    doc.text("ANSWER KEY", margin + 5, cursorY);
    cursorY += 10;

    if (activity.teacher_guide.key_answers) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      activity.teacher_guide.key_answers.forEach((ans, i) => {
        // Zebra striping
        if (i % 2 === 0) {
          doc.setFillColor(...slate50);
          doc.rect(margin + 5, cursorY - 4, contentW - 5, 8, 'F');
        }

        doc.setTextColor(...slate800);
        doc.text(`${i + 1}.`, margin + 10, cursorY + 1.5);
        doc.setTextColor(22, 163, 74); // Green 600
        doc.text(ans, margin + 20, cursorY + 1.5);

        cursorY += 8;
      });
    }

    drawFooter(pageNumber);
    doc.save(`${activity.title.replace(/\s+/g, '_')}_Lesson.pdf`);
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