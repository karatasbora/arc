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

    // 1. COMPACT METRICS
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 12; // Reduced from 15
    const colWidth = width - (margin * 2);

    // Theme Colors
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
    };
    const primaryRGB = hexToRgb(themeColors.primary);
    const darkText = [30, 41, 59];
    const mutedText = [100, 116, 139];

    // 2. STATE & HELPERS
    let cursorY = 0;
    let pageNumber = 1;

    const drawFooter = (pNum) => {
      // Minimalist Footer line
      doc.setDrawColor(200);
      doc.line(margin, height - 12, width - margin, height - 12);

      doc.setFontSize(8);
      doc.setTextColor(...mutedText);
      doc.setFont("helvetica", "bold");
      doc.text(`${activity.title}  |  UNIT 1`, margin, height - 8);
      doc.text(`${pNum}`, width - margin, height - 8, { align: 'right' });
    };

    const checkSpace = (required) => {
      if (cursorY + required > height - 15) {
        drawFooter(pageNumber);
        doc.addPage();
        pageNumber++;
        cursorY = 15; // Tighter top margin
      }
    };

    // Helper: Badge Icon
    const drawBadge = (x, y, num) => {
      doc.setFillColor(...primaryRGB);
      doc.circle(x + 3, y - 1, 3.5, 'F');
      doc.setTextColor(255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(num.toString(), x + 3, y, { align: 'center', baseline: 'middle' });
    };

    // --- GENERATION START ---

    // === COMPACT HEADER (28mm height) ===
    doc.setFillColor(...primaryRGB);
    doc.rect(0, 0, width, 28, 'F');

    // Title
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(activity.title, margin, 12);

    // Subtitle Row
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${activity.meta.level} • ${activity.meta.type.toUpperCase()} • 20 MIN`, margin, 20);

    // Mascot (Smaller, Tucked in)
    if (mascotUrl) {
      try {
        const base64Img = await getBase64FromUrl(mascotUrl);
        // Circle crop simulation (white ring)
        doc.setDrawColor(255);
        doc.setLineWidth(1);
        doc.circle(width - 20, 14, 10, 'S');
        doc.addImage(base64Img, 'JPEG', width - 30, 4, 20, 20);
      } catch (e) { console.error(e); }
    }

    cursorY = 35; // Start content much higher

    // === STUDENT INFO BAR ===
    doc.setFontSize(9);
    doc.setTextColor(...mutedText);
    doc.text("Name: ______________________", margin, cursorY);
    doc.text("Date: ______________________", width - margin - 40, cursorY);
    cursorY += 8;

    // === SECTION 1: CONTEXT (Compact Box) ===
    checkSpace(30);

    // Instruction Box
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.setDrawColor(226, 232, 240); // Slate-200
    // Calculate height dynamically
    const instrLines = doc.splitTextToSize(activity.student_worksheet.instructions, colWidth - 8);
    const boxH = (instrLines.length * 4) + 12; // Tight padding

    doc.roundedRect(margin, cursorY, colWidth, boxH, 2, 2, 'FD');

    // Label
    doc.setTextColor(...primaryRGB);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("INSTRUCTIONS", margin + 4, cursorY + 6);

    // Text
    doc.setTextColor(...darkText);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(instrLines, margin + 4, cursorY + 11);

    cursorY += boxH + 8; // Small gap

    // === SECTION 2: QUESTIONS (Grid Logic) ===

    activity.student_worksheet.questions.forEach((q, i) => {
      // 1. Calculate height needed
      let heightNeeded = 15; // Base for question text

      // Heuristic: Do options fit on one line?
      const isCompactOptions = q.options && q.options.join(' ').length < 60;

      if (q.options) {
        heightNeeded += isCompactOptions ? 8 : (q.options.length * 6);
      } else if (activityType === 'true_false') {
        heightNeeded += 8;
      } else {
        heightNeeded += 12; // Writing lines
      }

      if (q.hint && isScaffolded) heightNeeded += 8; // Hint strip

      checkSpace(heightNeeded);

      // 2. Render Question
      drawBadge(margin, cursorY + 3, i + 1);

      doc.setTextColor(...darkText);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5); // Slightly smaller professional font

      // Text wrapping with indent
      const qLines = doc.splitTextToSize(q.question_text, colWidth - 10);
      doc.text(qLines, margin + 10, cursorY + 3);

      let localY = cursorY + (qLines.length * 4.5) + 2;

      // 3. Render Options
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      if (q.options && q.options.length > 0) {
        if (isCompactOptions) {
          // HORIZONTAL LAYOUT (Save space!)
          let optX = margin + 10;
          q.options.forEach(opt => {
            doc.rect(optX, localY - 3, 3, 3); // Checkbox
            doc.text(opt, optX + 5, localY);
            optX += (doc.getTextWidth(opt) + 15); // Dynamic spacing
          });
          localY += 6;
        } else {
          // VERTICAL LAYOUT (Standard)
          q.options.forEach(opt => {
            doc.rect(margin + 10, localY - 3, 3, 3);
            doc.text(opt, margin + 16, localY);
            localY += 5; // Very tight leading
          });
        }
      } else if (activityType === 'true_false') {
        doc.text("[  ] TRUE      [  ] FALSE", margin + 10, localY);
        localY += 6;
      } else {
        // Writing Lines (Dotted look is cleaner)
        doc.setDrawColor(200);
        doc.setLineDash([1, 1], 0);
        doc.line(margin + 10, localY + 4, width - margin, localY + 4);
        doc.setLineDash([], 0); // Reset
        localY += 8;
      }

      // 4. Render Slim Hint (Inline Strip)
      if (q.hint && isScaffolded) {
        doc.setFillColor(255, 251, 235); // Amber-50
        doc.rect(margin + 10, localY - 3, colWidth - 10, 6, 'F');

        doc.setTextColor(180, 83, 9); // Amber-700
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("HINT:", margin + 12, localY + 1);

        doc.setFont("helvetica", "italic");
        doc.text(q.hint, margin + 22, localY + 1);
        localY += 6;
      }

      cursorY = localY + 4; // Minimal gap between questions
    });

    drawFooter(pageNumber);

    // === PAGE END: TEACHER KEY (Compact) ===
    // Only add new page if we really have to, otherwise try to fit at bottom?
    // Standards usually dictate a new page for keys so students don't see it.
    doc.addPage();
    pageNumber++;
    cursorY = 15;

    doc.setFillColor(50);
    doc.rect(0, 0, width, 15, 'F'); // Mini Header
    doc.setTextColor(255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TEACHER'S COMPANION", margin, 10);

    cursorY = 25;

    // Two Column Layout for Teacher Page
    // Col 1: Rationale
    doc.setTextColor(...darkText);
    doc.setFontSize(9);
    doc.text("RATIONALE:", margin, cursorY);
    const ratLines = doc.splitTextToSize(activity.teacher_guide.rationale, (colWidth / 2) - 5);
    doc.setFont("helvetica", "normal");
    doc.text(ratLines, margin, cursorY + 5);

    // Col 2: Answers
    const col2X = (width / 2) + 5;
    doc.setFont("helvetica", "bold");
    doc.text("ANSWER KEY:", col2X, 25);
    doc.setFont("helvetica", "normal");

    let keyY = 30;
    if (activity.teacher_guide.key_answers) {
      activity.teacher_guide.key_answers.forEach((ans, i) => {
        doc.text(`${i + 1}. ${ans}`, col2X, keyY);
        keyY += 5;
      });
    }

    doc.save(`${activity.title.replace(/\s+/g, '_')}_Compact.pdf`);
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