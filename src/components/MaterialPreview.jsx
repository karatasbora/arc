import React, { useEffect } from 'react';
import { Palette, Download, HelpCircle, MapPin, User, Utensils, Clock, AlertTriangle, GripVertical, Trash2, Save, GraduationCap, BookOpen } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// "SmartTags" Logic
const getCategoryBadge = (text) => {
    if (!text) return { label: "detail", icon: <HelpCircle size={10} />, class: "badge-detail" };
    const lower = text.toLowerCase();
    if (lower.includes('where') || lower.includes('place')) return { label: "location", icon: <MapPin size={10} />, class: "badge-zinc" };
    if (lower.includes('who')) return { label: "character", icon: <User size={10} />, class: "badge-zinc" };
    if (lower.includes('what') && (lower.includes('eat') || lower.includes('food'))) return { label: "food", icon: <Utensils size={10} />, class: "badge-zinc" };
    if (lower.includes('when') || lower.includes('time')) return { label: "time", icon: <Clock size={10} />, class: "badge-zinc" };
    return { label: "detail", icon: <HelpCircle size={10} />, class: "badge-detail" };
};

// Sortable Question Component
function SortableQuestion({ id, q, index, isScaffolded, onEdit, onDelete }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        marginBottom: '30px',
        position: 'relative',
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none' // Prevent scrolling while dragging on touch
    };

    const badge = getCategoryBadge(q.question_text);

    return (
        <div ref={setNodeRef} style={style} className="sortable-item">
            {/* Controls */}
            <div className="drag-controls" style={{
                position: 'absolute', left: '-40px', top: '0', display: 'flex', flexDirection: 'column', gap: '8px',
                opacity: 0.4, transition: 'opacity 0.2s', height: '100%'
            }}>
                <div {...attributes} {...listeners} style={{ cursor: 'grab', padding: '4px' }} title="Drag to reorder">
                    <GripVertical size={20} />
                </div>
                <button onClick={() => onDelete(index)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }} title="Delete Question">
                    <Trash2 size={18} color="#ef4444" />
                </button>
            </div>

            {/* HEADER / BADGE */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className={badge.class}>
                    {badge.icon} {badge.label}
                </span>
            </div>

            {/* QUESTION TEXT */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--slate-300)', fontSize: '1rem', fontWeight: '600', flexShrink: 0, marginTop: '8px' }}>{index + 1}</span>
                <textarea
                    rows={1}
                    value={q.question_text || ''}
                    onChange={(e) => onEdit(index, 'question_text', e.target.value)}
                    placeholder="Enter question..."
                    style={{
                        fontSize: '1.1rem', fontWeight: '500', lineHeight: '1.5', color: 'var(--slate-900)',
                        width: '100%', border: '1px solid transparent', background: 'transparent', padding: '6px', borderRadius: '6px',
                        fontFamily: 'inherit', resize: 'none', overflow: 'hidden', minHeight: '38px'
                    }}
                    onFocus={(e) => { e.target.style.border = '1px solid var(--slate-300)'; e.target.style.background = 'white'; }}
                    onBlur={(e) => { e.target.style.border = '1px solid transparent'; e.target.style.background = 'transparent'; }}
                    className="editable-textarea"
                />
            </div>

            {/* OPTIONS */}
            <div style={{ paddingLeft: '24px' }}>
                {q.options ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                        {q.options.map((opt, optIndex) => (
                            <div key={optIndex} style={{
                                padding: '6px 12px', border: '1px solid var(--slate-100)', borderRadius: '6px',
                                fontSize: '0.9rem', color: 'var(--slate-600)', display: 'flex', gap: '12px', alignItems: 'center'
                            }}>
                                <div style={{ width: '14px', height: '14px', border: '1px solid var(--slate-300)', borderRadius: '50%', flexShrink: 0 }}></div>
                                <input
                                    type="text"
                                    value={opt || ''}
                                    onChange={(e) => {
                                        const newOptions = [...q.options];
                                        newOptions[optIndex] = e.target.value;
                                        onEdit(index, 'options', newOptions);
                                    }}
                                    placeholder={`Option ${optIndex + 1}`}
                                    style={{
                                        width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'inherit',
                                        fontSize: 'inherit', fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ borderBottom: '1px solid var(--slate-100)', height: '30px', width: '100%' }}></div>
                )}
            </div>

            {/* HINT */}
            {q.hint && isScaffolded && (
                <div style={{
                    marginTop: '12px', marginLeft: '24px',
                    color: '#d97706', fontSize: '0.8rem', display: 'flex', gap: '6px', alignItems: 'center'
                }}>
                    <AlertTriangle size={12} />
                    <input
                        type="text"
                        value={q.hint || ''}
                        onChange={(e) => onEdit(index, 'hint', e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', color: '#d97706', fontStyle: 'italic', width: '100%' }}
                    />
                </div>
            )}
        </div>
    );
}

export default function MaterialPreview({ activity, mascotUrl, isScaffolded, onDownload, onUpdate, onSave }) {

    const [showTeacherMode, setShowTeacherMode] = React.useState(false);

    // ENSURE STABLE IDs
    useEffect(() => {
        if (activity?.student_worksheet?.questions) {
            const needsIds = activity.student_worksheet.questions.some(q => !q.uid);
            if (needsIds) {
                const newQuestions = activity.student_worksheet.questions.map(q => ({
                    ...q,
                    uid: q.uid || Math.random().toString(36).substr(2, 9)
                }));
                onUpdate({
                    ...activity,
                    student_worksheet: { ...activity.student_worksheet, questions: newQuestions }
                });
            }
        }
    }, [activity, onUpdate]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            // Find indexes based on UID
            const oldIndex = activity.student_worksheet.questions.findIndex(q => q.uid === active.id);
            const newIndex = activity.student_worksheet.questions.findIndex(q => q.uid === over.id);

            const newQuestions = arrayMove(activity.student_worksheet.questions, oldIndex, newIndex);

            onUpdate({
                ...activity,
                student_worksheet: { ...activity.student_worksheet, questions: newQuestions }
            });
        }
    };

    const handleQuestionEdit = (index, field, value) => {
        const newQuestions = [...activity.student_worksheet.questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        onUpdate({
            ...activity,
            student_worksheet: { ...activity.student_worksheet, questions: newQuestions }
        });
    };

    const handleDelete = (index) => {
        if (confirm("Delete this question?")) {
            const newQuestions = activity.student_worksheet.questions.filter((_, i) => i !== index);
            onUpdate({
                ...activity,
                student_worksheet: { ...activity.student_worksheet, questions: newQuestions }
            });
        }
    };

    const handleMainEdit = (field, value) => {
        if (field === 'instructions') {
            onUpdate({
                ...activity,
                student_worksheet: { ...activity.student_worksheet, instructions: value }
            });
        } else if (field === 'title') {
            onUpdate({ ...activity, title: value });
        }
    };

    const handleSave = () => {
        if (onSave) {
            onSave(activity);
            const btn = document.getElementById('save-btn');
            if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = 'Saved!';
                setTimeout(() => btn.innerHTML = originalText, 2000);
            }
        }
    };

    if (!activity) {
        return (
            <div className="preview-panel">
                <div className="flex-column-center" style={{ height: '100%', opacity: 0.6, color: 'var(--slate-400)' }}>
                    <div className="flex-column-center shadow-soft" style={{
                        background: 'white', padding: '30px', borderRadius: '50%',
                        marginBottom: '20px', boxShadow: 'var(--shadow-md)'
                    }}>
                        <Palette size={48} strokeWidth={1} color="var(--slate-900)" />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--slate-900)', marginBottom: '8px', fontWeight: 600 }}>Start Your Blueprint</h3>
                    <p style={{ maxWidth: '300px', textAlign: 'center', fontSize: '0.9rem' }}>
                        Configure the material parameters and click Generate to construct a new material plan.
                    </p>
                </div>
            </div>
        );
    }

    const questions = activity.student_worksheet?.questions || [];
    const hasIds = questions.every(q => q.uid);

    // Prevent crash if IDs are not yet assigned
    if (!hasIds) {
        return (
            <div className="preview-panel">
                <div className="flex-column-center" style={{ height: '100%' }}>
                    <div className="animate-spin" style={{
                        width: '24px', height: '24px',
                        border: '2px solid var(--slate-200)',
                        borderTopColor: 'var(--slate-600)',
                        borderRadius: '50%'
                    }}></div>
                </div>
            </div>
        );
    }

    return (
        <div className="preview-panel">
            <div className="paper" key={activity.id}>
                {/* HEADER */}
                <div style={{ marginBottom: '40px', borderBottom: '1px solid var(--slate-200)', paddingBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1, paddingRight: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', gap: '20px' }}>
                                {/* EDITABLE TITLE */}
                                <input
                                    type="text"
                                    value={activity.title || ''}
                                    onChange={(e) => handleMainEdit('title', e.target.value)}
                                    style={{
                                        margin: 0, fontSize: '2rem', letterSpacing: '-0.03em', lineHeight: '1.2',
                                        width: '100%', border: 'none', background: 'transparent', fontWeight: 700,
                                        fontFamily: 'inherit', outline: 'none'
                                    }}
                                    className="editable-title"
                                />

                                <div className="action-buttons" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        className="download-btn"
                                        onClick={() => setShowTeacherMode(!showTeacherMode)}
                                        style={{
                                            background: showTeacherMode ? 'var(--cyan-100)' : 'white',
                                            border: showTeacherMode ? '1px solid var(--cyan-500)' : '1px solid var(--slate-200)',
                                            color: showTeacherMode ? 'var(--cyan-900)' : 'var(--slate-700)',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            fontSize: '0.85rem', fontWeight: 600,
                                            boxShadow: 'var(--shadow-sm)',
                                            transition: 'all 0.2s'
                                        }}
                                        title="Toggle Teacher Guide"
                                    >
                                        <GraduationCap size={16} /> <span>Teacher Mode</span>
                                    </button>

                                    <button id="save-btn" onClick={handleSave} className="download-btn" style={{
                                        background: 'var(--slate-800)',
                                        border: '1px solid var(--slate-900)',
                                        color: 'white',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        fontSize: '0.85rem', fontWeight: 500,
                                        boxShadow: 'var(--shadow-sm)'
                                    }} title="Save Changes">
                                        <Save size={16} /> <span>Save</span>
                                    </button>

                                    <button onClick={onDownload} className="download-btn" style={{
                                        background: 'white',
                                        border: '1px solid var(--slate-200)',
                                        color: 'var(--slate-950)',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        fontSize: '0.85rem', fontWeight: 500,
                                        boxShadow: 'var(--shadow-sm)'
                                    }} title="Export as PDF">
                                        <Download size={16} /> <span>PDF</span>
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', color: 'var(--slate-500)', fontSize: '0.8rem', fontWeight: 600 }}>
                                <span style={{ border: '1px solid var(--slate-200)', padding: '2px 8px', borderRadius: '4px' }}>{activity.meta?.level}</span>
                                <span style={{ border: '1px solid var(--slate-200)', padding: '2px 8px', borderRadius: '4px' }}>{activity.meta?.type?.toUpperCase()}</span>
                            </div>
                        </div>
                        {mascotUrl && (
                            <img src={mascotUrl} alt="Material Mascot" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', filter: 'grayscale(100%)' }} />
                        )}
                    </div>
                </div>

                {/* TEACHER MODE: GUIDE SECTION */}
                {showTeacherMode && activity.teacher_guide && (
                    <div style={{
                        marginBottom: '30px', padding: '20px',
                        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', color: '#1e40af', fontWeight: 'bold' }}>
                            <BookOpen size={18} /> <span>TEACHER GUIDE</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#60a5fa', marginBottom: '8px' }}>Answer Key</h4>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem', color: '#1e3a8a' }}>
                                    {activity.teacher_guide.answer_key?.map((ans, i) => (
                                        <li key={i} style={{ marginBottom: '4px' }}>{ans}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#60a5fa', marginBottom: '8px' }}>Concept Check Questions</h4>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem', color: '#1e3a8a' }}>
                                    {activity.teacher_guide.concept_check_questions?.map((ccq, i) => (
                                        <li key={i} style={{ marginBottom: '4px' }}>• {ccq}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        {activity.teacher_guide.anticipated_problems && (
                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #dbeafe' }}>
                                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#60a5fa', marginBottom: '8px' }}>Anticipated Problems</h4>
                                <p style={{ fontSize: '0.9rem', color: '#1e3a8a', margin: 0 }}>{activity.teacher_guide.anticipated_problems}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* INSTRUCTIONS */}
                <div style={{ marginBottom: '30px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--slate-400)', marginBottom: '8px', textTransform: 'uppercase' }}>Instructions</div>
                    <textarea
                        value={activity.student_worksheet?.instructions || ''}
                        onChange={(e) => handleMainEdit('instructions', e.target.value)}
                        style={{
                            fontSize: '0.95rem', lineHeight: '1.6', width: '100%',
                            border: '1px solid transparent', background: 'transparent', borderRadius: '4px',
                            resize: 'vertical', fontFamily: 'inherit', padding: '4px'
                        }}
                        onFocus={(e) => { e.target.style.border = '1px solid var(--slate-300)'; e.target.style.background = 'white'; }}
                        onBlur={(e) => { e.target.style.border = '1px solid transparent'; e.target.style.background = 'transparent'; }}
                    />
                </div>

                {/* QUESTIONS (SORTABLE) */}
                <div className="questions-list">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={questions.map(q => q.uid)}
                            strategy={verticalListSortingStrategy}
                        >
                            {questions.map((q, i) => (
                                <SortableQuestion
                                    key={q.uid}
                                    id={q.uid}
                                    q={q}
                                    index={i}
                                    isScaffolded={isScaffolded}
                                    onEdit={handleQuestionEdit}
                                    onDelete={handleDelete}
                                    getCategoryBadge={getCategoryBadge}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>

                {/* FUNCTIONAL LANGUAGE (For Discussion) */}
                {activity.student_worksheet?.functional_language && (
                    <div style={{ marginTop: '30px', padding: '15px', background: 'var(--slate-50)', borderRadius: '8px', border: '1px dashed var(--slate-300)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--slate-500)', marginBottom: '10px', textTransform: 'uppercase' }}>Useful Phrases</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {activity.student_worksheet.functional_language.map((phrase, i) => (
                                <span key={i} style={{
                                    background: 'white', padding: '6px 12px', borderRadius: '20px',
                                    border: '1px solid var(--slate-200)', fontSize: '0.9rem', color: 'var(--slate-700)',
                                    fontWeight: 500
                                }}>
                                    {phrase}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* GLOSSARY */}
                {activity.student_worksheet?.glossary && activity.student_worksheet.glossary.length > 0 && (
                    <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--slate-100)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--slate-400)', marginBottom: '15px', textTransform: 'uppercase' }}>Key Vocabulary</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                            {activity.student_worksheet.glossary.map((item, i) => (
                                <div key={i} style={{
                                    background: 'var(--slate-50)', padding: '15px', borderRadius: '8px',
                                    border: '1px solid var(--slate-100)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <input
                                            type="text"
                                            value={item.word || ''}
                                            onChange={(e) => {
                                                const newGlossary = [...activity.student_worksheet.glossary];
                                                newGlossary[i] = { ...newGlossary[i], word: e.target.value };
                                                onUpdate({
                                                    ...activity,
                                                    student_worksheet: { ...activity.student_worksheet, glossary: newGlossary }
                                                });
                                            }}
                                            style={{
                                                fontWeight: '700', fontSize: '1rem', color: 'var(--slate-900)',
                                                width: '70%', background: 'transparent', border: 'none', outline: 'none'
                                            }}
                                            placeholder="Word"
                                        />
                                        <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)', fontStyle: 'italic' }}>
                                            {item.type || 'word'}
                                        </span>
                                    </div>

                                    {/* IPA support */}
                                    {item.ipa && (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)', fontFamily: 'Lucida Sans Unicode, Arial Unicode MS, sans-serif', marginBottom: '8px' }}>
                                            {item.ipa}
                                        </div>
                                    )}

                                    <textarea
                                        rows={2}
                                        value={item.definition || ''}
                                        onChange={(e) => {
                                            const newGlossary = [...activity.student_worksheet.glossary];
                                            newGlossary[i] = { ...newGlossary[i], definition: e.target.value };
                                            onUpdate({
                                                ...activity,
                                                student_worksheet: { ...activity.student_worksheet, glossary: newGlossary }
                                            });
                                        }}
                                        style={{
                                            fontSize: '0.9rem', color: 'var(--slate-600)', lineHeight: '1.4',
                                            width: '100%', background: 'transparent', border: 'none',
                                            outline: 'none', resize: 'none', fontFamily: 'inherit',
                                            marginBottom: '8px'
                                        }}
                                        placeholder="Definition"
                                    />

                                    {/* Example Sentence */}
                                    {item.example && (
                                        <div style={{
                                            fontSize: '0.85rem', color: 'var(--slate-500)',
                                            fontStyle: 'italic', borderLeft: '2px solid var(--slate-300)',
                                            paddingLeft: '8px', marginTop: '8px'
                                        }}>
                                            "{item.example}"
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>


    );
}
