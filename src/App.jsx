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

    // 1. CONSTANTS & THEME SETUP
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 20;
    const sidebarWidth = 8;
    const contentWidth = width - margin * 2 - sidebarWidth;

    // Convert Hex to RGB for jsPDF
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
    };
    const primaryRGB = hexToRgb(themeColors.primary);
    const accentRGB = [243, 244, 246]; // Light gray #f3f4f6 for backgrounds

    // 2. LAYOUT ENGINE STATE
    let cursorY = 0;
    let pageNumber = 1;

    // 3. HELPER FUNCTIONS

    // Draws the persistent sidebar accent on the current page
    const drawSidebar = () => {
      doc.setFillColor(...primaryRGB);
      doc.rect(0, 0, sidebarWidth, height, 'F');
    };

    // Draws the footer with page number
    const drawFooter = (pageNum) => {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.setFont("helvetica", "normal");
      const text = `Page ${pageNum}  |  Generated by LessonArchitect`;
      doc.text(text, width - margin - doc.getTextWidth(text), height - 10);
    };

    // Checks space and adds a new page if necessary
    const checkSpace = (requiredSpace) => {
      if (cursorY + requiredSpace > height - margin) {
        drawFooter(pageNumber); // Close current page
        doc.addPage();
        pageNumber++;
        drawSidebar(); // Setup new page
        cursorY = margin; // Reset cursor
      }
    };

    // Wraps text and advances cursor automatically
    const printText = (text, fontSize, fontType, color = [0, 0, 0], indent = 0) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", fontType);
      doc.setTextColor(...color);

      const lines = doc.splitTextToSize(text, contentWidth - indent);
      const textHeight = lines.length * (fontSize * 0.4); // Approx line height calculation

      checkSpace(textHeight + 5);
      doc.text(lines, margin + sidebarWidth + indent, cursorY);
      cursorY += textHeight + 5;
    };

    // --- DOCUMENT GENERATION START ---

    // COVER / HEADER SECTION
    drawSidebar();

    // Draw Hero Header Background
    doc.setFillColor(...primaryRGB);
    doc.rect(sidebarWidth, 0, width - sidebarWidth, 60, 'F');

    // Title & Meta (White Text)
    cursorY = 25;
    printText(activity.title, 24, "bold", [255, 255, 255]);
    cursorY -= 2; // Tighten spacing
    printText(`${activity.meta.level}  •  ${activity.meta.type.toUpperCase()}  •  20 MIN`, 10, "normal", [255, 255, 255]);

    // Embed Mascot Image (Top Right)
    if (mascotUrl) {
      try {
        const base64Img = await getBase64FromUrl(mascotUrl);
        doc.setDrawColor(255);
        doc.setLineWidth(1);
        doc.roundedRect(width - 55, 10, 40, 40, 2, 2, 'S'); // White border
        doc.addImage(base64Img, 'JPEG', width - 55, 10, 40, 40);
      } catch (e) { console.error("Img error", e); }
    }

    // Reset cursor for content
    cursorY = 75;

    // STUDENT DETAILS SECTION
    checkSpace(20);
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(margin + sidebarWidth, cursorY + 10, width - margin, cursorY + 10);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Student Name:", margin + sidebarWidth, cursorY);
    doc.text("Date:", width / 2, cursorY);
    cursorY += 25;

    // INSTRUCTIONS BOX
    const instrHeight = doc.splitTextToSize(activity.student_worksheet.instructions, contentWidth - 10).length * 5 + 15;
    checkSpace(instrHeight);

    // Draw light background box for instructions
    doc.setFillColor(...accentRGB);
    doc.roundedRect(margin + sidebarWidth, cursorY - 5, contentWidth, instrHeight, 2, 2, 'F');

    // Draw left border accent for instructions
    doc.setFillColor(...primaryRGB);
    doc.rect(margin + sidebarWidth, cursorY - 5, 2, instrHeight, 'F');

    cursorY += 2; // Padding
    printText("INSTRUCTIONS", 9, "bold", primaryRGB, 5);
    printText(activity.student_worksheet.instructions, 10, "normal", [50, 50, 50], 5);
    cursorY += 10; // Margin after box

    // QUESTIONS SECTION
    activity.student_worksheet.questions.forEach((q, i) => {
      // Calculate space needed for this entire question block
      let requiredSpace = 20;
      if (q.options) requiredSpace += (q.options.length * 7);

      checkSpace(requiredSpace);

      // Question Number Bubble
      doc.setFillColor(...primaryRGB);
      doc.circle(margin + sidebarWidth + 4, cursorY - 3, 4, 'F');
      doc.setTextColor(255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${i + 1}`, margin + sidebarWidth + 2.5, cursorY - 0.5);

      // Question Text
      printText(q.question_text, 11, "bold", [0, 0, 0], 12);

      // Options or Writing Space
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0);

      if (q.options && q.options.length > 0) {
        q.options.forEach(opt => {
          checkSpace(8);
          // Custom Checkbox
          doc.setDrawColor(150);
          doc.roundedRect(margin + sidebarWidth + 12, cursorY - 4, 4, 4, 1, 1);
          doc.text(opt, margin + sidebarWidth + 20, cursorY);
          cursorY += 7;
        });
      } else if (activityType === 'true_false') {
        checkSpace(10);
        doc.text("TRUE   /   FALSE", margin + sidebarWidth + 12, cursorY);
        cursorY += 10;
      } else {
        // Writing Lines
        checkSpace(15);
        doc.setDrawColor(230);
        doc.line(margin + sidebarWidth + 12, cursorY, width - margin, cursorY);
        cursorY += 8;
        doc.line(margin + sidebarWidth + 12, cursorY, width - margin, cursorY);
        cursorY += 10;
      }

      // Scaffolding Hint
      if (q.hint && isScaffolded) {
        checkSpace(8);
        doc.setTextColor(...primaryRGB);
        doc.setFontSize(8);
        doc.text(`💡 HINT: ${q.hint}`, margin + sidebarWidth + 12, cursorY - 2);
        cursorY += 5;
      }

      cursorY += 5; // Spacing between questions
    });

    drawFooter(pageNumber);

    // --- TEACHER'S GUIDE (New Page) ---
    doc.addPage();
    pageNumber++;
    drawSidebar();
    cursorY = margin;

    // Teacher Header
    doc.setFillColor(50, 50, 50); // Dark Grey for Admin
    doc.rect(sidebarWidth, 0, width - sidebarWidth, 30, 'F');
    doc.setTextColor(255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TEACHER'S GUIDE & ANSWER KEY", margin + sidebarWidth, 20);

    cursorY = 45;

    // Rationale
    printText("PEDAGOGICAL RATIONALE", 10, "bold", [100, 100, 100]);
    printText(activity.teacher_guide.rationale, 10, "normal", [0, 0, 0]);
    cursorY += 10;

    // Answer Key
    printText("ANSWER KEY", 10, "bold", [100, 100, 100]);
    if (activity.teacher_guide.key_answers) {
      activity.teacher_guide.key_answers.forEach((ans, i) => {
        printText(`${i + 1}. ${ans}`, 10, "normal", [0, 128, 0]); // Green text for answers
      });
    }

    drawFooter(pageNumber);

    // Save
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