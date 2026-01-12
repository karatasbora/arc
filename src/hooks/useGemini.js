import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";

export function useGemini() {
    // --- STATE ---
    const [apiKey, setApiKey] = useState(() => {
        try { return localStorage.getItem('gemini_key') || ''; }
        catch (e) { return ''; }
    });

    const [transcript, setTranscript] = useState('');
    const [activityType, setActivityType] = useState('comprehension');
    const [cefrLevel, setCefrLevel] = useState('B1');
    const [isScaffolded, setIsScaffolded] = useState(false);
    const [length, setLength] = useState('medium');
    const [audience, setAudience] = useState('adults');
    const [visualStyle, setVisualStyle] = useState('minimal vector line art');
    const [mascotPref, setMascotPref] = useState('');
    const [model, setModel] = useState('gemini-flash-latest');
    const [loading, setLoading] = useState(false);

    // Data State
    const [activity, setActivity] = useState(null);
    const [history, setHistory] = useState([]);
    const [mascotUrl, setMascotUrl] = useState(null);

    // --- PERSISTENCE ---
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('material_history') || '[]');
            if (Array.isArray(saved)) setHistory(saved);
        } catch (e) {
            localStorage.setItem('material_history', '[]');
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('gemini_key', apiKey);
    }, [apiKey]);

    // --- HISTORY ACTIONS ---
    const addToHistory = (newActivity, visualData) => {
        const newEntry = {
            date: new Date().toLocaleDateString(),
            ...newActivity,
            visuals: visualData
        };
        const updated = [newEntry, ...history];
        setHistory(updated);
        localStorage.setItem('material_history', JSON.stringify(updated));
    };

    const loadFromHistory = (item) => {
        if (!item || !item.student_worksheet) return alert("Invalid saved material.");
        setActivity(item);
        if (item.visuals) setMascotUrl(item.visuals.mascotUrl);
        if (item.meta) {
            setCefrLevel(item.meta.level || 'B1');
            setActivityType(item.meta.type || 'comprehension');
        }
        // Ensure UIDs exist
        if (item.student_worksheet?.questions && item.student_worksheet.questions.some(q => !q.uid)) {
            const fixedQuestions = item.student_worksheet.questions.map(q => ({
                ...q, uid: q.uid || Math.random().toString(36).substr(2, 9)
            }));
            setActivity({
                ...item,
                student_worksheet: { ...item.student_worksheet, questions: fixedQuestions }
            });
        }
    };

    const clearHistory = () => {
        if (confirm("Clear all saved materials?")) {
            setHistory([]);
            setActivity(null);
            localStorage.setItem('material_history', '[]');
        }
    };

    // --- GENERATION LOGIC ---
    const handleGenerate = async () => {
        if (!apiKey) return alert("Please enter API Key");
        setLoading(true);
        setActivity(null);
        setMascotUrl(null);

        // DEBUG MODE CHECK
        if (apiKey.trim().toUpperCase() === 'DEBUG') {
            try {
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 1500));

                const mockData = {
                    title: "Debug Mode: Quantum Physics",
                    meta: { level: cefrLevel, type: activityType, duration: "20m" },
                    visual_theme: { primary_color: "#14b8a6", mascot_prompt: "A futuristic robot scientist" },
                    student_worksheet: {
                        instructions: "Read the following text and answer the questions. (DEBUG MODE)",
                        questions: [
                            { question_text: "What is a quantum?", options: ["A small packet of energy", "A type of fruit"], hint: "Think small." },
                            { question_text: "Is light a particle or a wave?", options: ["Particle", "Wave", "Both"], hint: "It's tricky!" }
                        ],
                        glossary: [{ word: "Quantum", definition: "The smallest amount of a physical quantity." }]
                    }
                };

                // ID injection for Debug Mode
                mockData.id = Date.now();
                mockData.student_worksheet.questions = mockData.student_worksheet.questions.map(q => ({
                    ...q, uid: Math.random().toString(36).substr(2, 9)
                }));
                setActivity(mockData);

                // Use a reliable placeholder or the user's pref
                const mockMascotUrl = "https://placehold.co/400x400/14b8a6/white?text=DEBUG+Mascot";
                setMascotUrl(mockMascotUrl);

                addToHistory(mockData, { mascotUrl: mockMascotUrl, themeColors: { primary: '#14b8a6' } });

            } catch (err) {
                alert("Debug Error: " + err.message);
            } finally {
                setLoading(false);
            }
            return; // EXIT FUNCTION EARLY
        }

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const genModel = genAI.getGenerativeModel({ model: model });

            let count = 10;
            if (length === 'short') count = 5;
            if (length === 'long') count = 15;

            let typePrompt = "";
            switch (activityType) {
                case 'vocabulary': typePrompt = `FOCUS: VOCABULARY. Extract ${count} difficult words. Create matching questions.`; break;
                case 'grammar': typePrompt = "FOCUS: GRAMMAR. Identify tense/structures. Create fill-in-the-blanks."; break;
                case 'true_false': typePrompt = `FOCUS: TRUE/FALSE. Create ${count} statements.`; break;
                case 'discussion': typePrompt = "FOCUS: SPEAKING. Create discussion prompts."; break;
                default: typePrompt = "FOCUS: COMPREHENSION. Standard open questions.";
            }

            const scaffoldPrompt = isScaffolded ? "SCAFFOLDING: ON. Hints, Multiple Choice." : "SCAFFOLDING: OFF.";

            const prompt = `
        You are "arc", an advanced Material Architect AI.
        TEXT: "${transcript}"
        CONFIG: ${typePrompt} | Level: ${cefrLevel} | Audience: ${audience} | ${scaffoldPrompt}
        
        TASK:
        1. Create content tailored for ${audience}.
        2. DESIGN A VISUAL THEME (primary_color, mascot_prompt).
        
        OUTPUT JSON ONLY:
        {
          "title": "Title",
          "meta": { "level": "${cefrLevel}", "type": "${activityType}", "duration": "20m" },
          "visual_theme": { "primary_color": "#hex", "mascot_prompt": "desc" },
          "student_worksheet": {
            "instructions": "...",
            "questions": [{ "question_text": "...", "options": ["A","B"], "hint": "..." }],
            "glossary": [{ "word": "...", "definition": "..." }]
          }
        }
      `;

            const result = await genModel.generateContent(prompt);
            const text = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(text);

            if (!data.student_worksheet) throw new Error("Invalid AI response");

            // ID injection for Real Mode
            data.id = Date.now();
            if (data.student_worksheet?.questions) {
                data.student_worksheet.questions = data.student_worksheet.questions.map(q => ({
                    ...q, uid: Math.random().toString(36).substr(2, 9)
                }));
            }
            setActivity(data);

            const mascotBase = mascotPref || (data.visual_theme?.mascot_prompt || "abstract concept");
            const promptEncoded = encodeURIComponent(mascotBase + " " + visualStyle + ", white background");
            const imageUrl = `https://image.pollinations.ai/prompt/${promptEncoded}?width=400&height=400&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;
            setMascotUrl(imageUrl);

            addToHistory(data, { mascotUrl: imageUrl, themeColors: { primary: '#09090b' } });

        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return {
        apiKey, setApiKey,
        transcript, setTranscript,
        activityType, setActivityType,
        cefrLevel, setCefrLevel,
        isScaffolded, setIsScaffolded,
        length, setLength,
        audience, setAudience,
        visualStyle, setVisualStyle,
        mascotPref, setMascotPref,
        model, setModel,
        loading,
        activity,
        history,
        mascotUrl,
        loadFromHistory,
        clearHistory,
        handleGenerate,
        setActivity // Exposed for Edit Mode
    };
}
