import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    signInAnonymously
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    onSnapshot, 
    doc, 
    deleteDoc, 
    updateDoc, 
    writeBatch,
    Timestamp,
    getDocs
} from 'firebase/firestore';
import { Mic, Trash2, Edit, Save, X, ChevronDown, ChevronUp, Languages, Search, LogOut, Palette, BookPlus } from 'lucide-react';

// --- PWA Setup ---
const PWASetup = () => {
    useEffect(() => {
        const manifest = {
            short_name: "Life Diary",
            name: "My Life Diary",
            icons: [{ src: "/MyLifeDiaryLogo.png", type: "image/png", sizes: "192x192" }, { src: "/MyLifeDiaryLogo.png", type: "image/png", sizes: "512x512" }],
            start_url: ".",
            display: "standalone",
            theme_color: "#2d3748",
            background_color: "#2d3748"
        };
        const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
        const manifestUrl = URL.createObjectURL(manifestBlob);
        const linkEl = document.createElement('link');
        linkEl.rel = 'manifest';
        linkEl.href = manifestUrl;
        document.head.appendChild(linkEl);
        const themeColorMeta = document.createElement('meta');
        themeColorMeta.name = 'theme-color';
        themeColorMeta.content = manifest.theme_color;
        document.head.appendChild(themeColorMeta);
        
        // Service Worker registration is removed as it's not supported in blob URLs (preview environment)
        // It will work correctly when deployed on a real domain like Vercel.
    }, []);
    return null;
};

// --- Firebase Configuration ---
let firebaseConfig, configError = null;
try {
    const configString = import.meta.env.VITE_FIREBASE_CONFIG;
    if (!configString) throw new Error("VITE_FIREBASE_CONFIG not in Vercel.");
    firebaseConfig = JSON.parse(configString);
} catch (e) {
    if (typeof __firebase_config !== 'undefined') {
        try { firebaseConfig = JSON.parse(__firebase_config); } catch (parseError) { configError = "Could not parse Firebase config (preview)."; }
    } else { configError = "Could not load Firebase configuration."; }
}
if (!firebaseConfig) firebaseConfig = { apiKey: "error", authDomain: "error", projectId: "error" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Color Utility Functions ---
const getTextColor = (bgColor) => {
    if (!bgColor) return '#ffffff';
    const color = (bgColor.charAt(0) === '#') ? bgColor.substring(1, 7) : bgColor;
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const uicolors = [r / 255, g / 255, b / 255];
    const c = uicolors.map((col) => {
        if (col <= 0.03928) return col / 12.92;
        return Math.pow((col + 0.055) / 1.055, 2.4);
    });
    const L = (0.2126 * c[0]) + (0.7152 * c[1]) + (0.0722 * c[2]);
    return (L > 0.179) ? '#000000' : '#ffffff';
};

const shadeColor = (color, percent) => {
    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);
    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);
    R = (R<255)?R:255;  
    G = (G<255)?G:255;  
    B = (B<255)?B:255;  
    const RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
    const GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
    const BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));
    return "#"+RR+GG+BB;
};

// --- SignIn Component ---
const SignIn = ({ themeColor }) => (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 transition-colors duration-300" style={{ backgroundColor: themeColor, color: getTextColor(themeColor) }}>
        <img src="/MyLifeDiaryLogo.png" alt="Logo" className="h-24 w-24 rounded-full mb-6" />
        <h1 className="text-5xl font-bold tracking-tight mb-4">My Life Diary</h1>
        <p className="opacity-80 mb-8 text-lg">Your personal voice-powered journal.</p>
        <button onClick={() => signInWithPopup(auth, new GoogleAuthProvider()).catch(e => alert(e.message))} className="flex items-center gap-4 bg-white/20 backdrop-blur-sm font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-shadow" style={{ color: getTextColor(themeColor) }}>
            <svg className="w-6 h-6" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
            Sign in with Google
        </button>
    </div>
);

// --- Main App Component ---
export default function App() {
    const [notes, setNotes] = useState([]);
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [editText, setEditText] = useState("");
    const [showPastNotes, setShowPastNotes] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [micError, setMicError] = useState('');
    const [language, setLanguage] = useState('en-US');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedItems, setExpandedItems] = useState({});
    const [themeColor, setThemeColor] = useState('#2d3748');
    const [isLoadingSamples, setIsLoadingSamples] = useState(false);
    const [firestoreError, setFirestoreError] = useState(null);
    const colorPickerRef = useRef(null);

    const recognitionRef = useRef(null);
    const transcriptRef = useRef("");

    // --- Theme Management ---
    useEffect(() => {
        const savedColor = localStorage.getItem('life-diary-theme-color') || '#2d3748';
        setThemeColor(savedColor);
    }, []);

    useEffect(() => {
        localStorage.setItem('life-diary-theme-color', themeColor);
    }, [themeColor]);

    // --- Authentication ---
    useEffect(() => {
        if (configError) return setAuthReady(true);
        const isPreview = typeof __firebase_config !== 'undefined';
        const unsub = onAuthStateChanged(auth, u => { (isPreview && !u) ? signInAnonymously(auth) : setUser(u); setAuthReady(true); });
        return () => unsub();
    }, []);

    // --- Firestore Data Fetching ---
    useEffect(() => {
        if (!user || configError) return setNotes([]);
        const q = query(collection(db, `users/${user.uid}/notes`));
        const unsub = onSnapshot(q, 
            (snap) => {
                setFirestoreError(null);
                setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0)))
            },
            (error) => {
                 if (error.code === 'permission-denied') {
                    setFirestoreError("Permission Denied: Your Firestore security rules have likely expired. Please update them in the Firebase console to allow access.");
                 } else {
                    setFirestoreError(`Database error: ${error.message}`);
                 }
                 console.error("Firestore snapshot error:", error);
            }
        );
        return () => unsub();
    }, [user]);
    
    // --- Speech Recognition Setup ---
    useEffect(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return setMicError("Speech recognition not supported.");
        const r = new SR();
        r.continuous = false; r.interimResults = false; r.lang = language;
        r.onresult = e => { transcriptRef.current = e.results[0][0].transcript; };
        r.onerror = e => { setMicError(`Speech error: ${e.error}`); setIsRecording(false); };
        r.onend = () => { setIsRecording(false); if (transcriptRef.current.trim()) addNote(transcriptRef.current); };
        recognitionRef.current = r;
    }, [user, language]);

    // --- Search Expansion Effect ---
    useEffect(() => {
        if (searchTerm.trim() === '') return; // <-- FIX: Do not collapse when search is cleared
        const matches = notes.filter(n => n.text.toLowerCase().includes(searchTerm.toLowerCase()) && n.timestamp?.toDate().toDateString() !== new Date().toDateString());
        if (matches.length > 0) setShowPastNotes(true);
        const newExpanded = {};
        matches.forEach(n => { const d = n.timestamp.toDate(); newExpanded[d.getFullYear()] = true; newExpanded[`${d.getFullYear()}-${d.toLocaleString('default',{month:'long'})}`] = true; });
        setExpandedItems(prev => ({...prev, ...newExpanded})); // Merge with existing expanded items
    }, [searchTerm, notes]);

    // --- Note Management ---
    const addNote = async text => { if (user && text.trim()) await addDoc(collection(db, `users/${user.uid}/notes`), { text: text.trim(), timestamp: Timestamp.now() }); };
    const deleteNote = async id => { if (user) await deleteDoc(doc(db, `users/${user.uid}/notes/${id}`)); };
    const handleDeleteSelection = s => setShowDeleteConfirm(s);
    const handleConfirmDelete = async () => {
        if (!user || !showDeleteConfirm) return;
        const toDelete = showDeleteConfirm.type === 'all' ? notes : notes.filter(n => {
            const d = n.timestamp?.toDate(); if(!d) return false;
            if (showDeleteConfirm.type === 'year') return d.getFullYear() === showDeleteConfirm.year;
            if (showDeleteConfirm.type === 'month') return d.getFullYear() === showDeleteConfirm.year && d.toLocaleString('default', { month: 'long' }) === showDeleteConfirm.month;
            return false;
        });
        if(toDelete.length === 0) return setShowDeleteConfirm(null);
        const batch = writeBatch(db);
        toDelete.forEach(n => batch.delete(doc(db, `users/${user.uid}/notes/${n.id}`)));
        await batch.commit();
        setShowDeleteConfirm(null);
    };
    const startEditing = n => { setEditingNote(n); setEditText(n.text); };
    const saveEdit = async () => {
        if(user && editingNote) await updateDoc(doc(db, `users/${user.uid}/notes/${editingNote.id}`), { text: editText });
        setEditingNote(null); setEditText("");
    };

    // --- Sample Data ---
    const loadSampleData = async () => {
        if (!user || isLoadingSamples) return;
        setIsLoadingSamples(true);
        try {
            const batch = writeBatch(db);
            const sampleNotes = [
                { text: "This is a note from today.", date: new Date() },
                { text: "And another one from today.", date: new Date() },
                { text: "A note from yesterday.", date: new Date(Date.now() - 86400000) },
                { text: "A note from last month.", date: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
                { text: "An entry from July 2024.", date: new Date('2024-07-15T10:00:00') },
                { text: "Thinking about the new year, back in January 2024.", date: new Date('2024-01-20T15:30:00') },
                { text: "A memory from a different year entirely.", date: new Date('2023-11-05T12:00:00') },
            ];
            sampleNotes.forEach(note => {
                const docRef = doc(collection(db, `users/${user.uid}/notes`));
                batch.set(docRef, { text: note.text, timestamp: Timestamp.fromDate(note.date) });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error loading sample data:", error);
            alert("Failed to load sample data. Please check your Firestore security rules and internet connection.");
        } finally {
            setIsLoadingSamples(false);
        }
    };

    // --- UI Handlers ---
    const handleRecordStart = () => { if (micError || !recognitionRef.current) return; transcriptRef.current = ""; setIsRecording(true); recognitionRef.current.start(); };
    const handleRecordStop = () => { if (micError || !recognitionRef.current || !isRecording) return; recognitionRef.current.stop(); };
    const toggleExpand = key => setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
    
    // --- UI Data Processing ---
    const textColor = getTextColor(themeColor);
    const subtleBgColor = shadeColor(themeColor, textColor === '#ffffff' ? 20 : -10);
    const accentColor = shadeColor(themeColor, textColor === '#ffffff' ? 40 : -20);
    const micColor = getTextColor(accentColor);
    
    const filteredNotes = notes.filter(n => n.text.toLowerCase().includes(searchTerm.toLowerCase()));
    const todayNotes = filteredNotes.filter(n => n.timestamp?.toDate().toDateString() === new Date().toDateString());
    const pastNotesRaw = filteredNotes.filter(n => n.timestamp?.toDate().toDateString() !== new Date().toDateString());
    const structuredPastNotes = pastNotesRaw.reduce((acc, note) => {
        const d=note.timestamp?.toDate();if(!d)return acc;const y=d.getFullYear(),m=d.toLocaleString('default',{month:'long'}),day=d.getDate();
        if(!acc[y])acc[y]={};if(!acc[y][m])acc[y][m]={};if(!acc[y][m][day])acc[y][m][day]=[];acc[y][m][day].push(note);return acc;
    }, {});

    // --- Render Logic ---
    if (configError) return <div className="min-h-screen flex items-center justify-center p-4"><div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg max-w-lg">{configError}</div></div>;
    if (!authReady) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: themeColor }}>Loading...</div>;
    if (!user) return <SignIn themeColor={themeColor} />;

    let confirmText = 'Are you sure you want to delete all your notes? This action cannot be undone.';
    if(showDeleteConfirm) { if(showDeleteConfirm.type === 'year') confirmText = `Delete all notes from ${showDeleteConfirm.year}?`; if(showDeleteConfirm.type === 'month') confirmText = `Delete all notes from ${showDeleteConfirm.month} ${showDeleteConfirm.year}?`; }

    const renderNote = (note) => (
        <div key={note.id} className="p-4 rounded-lg flex justify-between items-start gap-4 break-words shadow-sm" style={{ backgroundColor: subtleBgColor, color: textColor }}>
            <div className="flex-grow">
                {editingNote?.id===note.id ? <textarea value={editText} onChange={e=>setEditText(e.target.value)} className="w-full bg-transparent border-b-2 focus:outline-none" style={{ borderColor: accentColor }} /> : <p>{note.text}</p>}
                <p className="text-sm mt-2 opacity-60">{note.timestamp?.toDate().toLocaleString() || 'Just now'}</p>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
                {editingNote?.id===note.id ? (<><button onClick={saveEdit}><Save size={20}/></button><button onClick={()=>setEditingNote(null)}><X size={20}/></button></>) : (<><button onClick={()=>startEditing(note)}><Edit size={20}/></button><button onClick={()=>deleteNote(note.id)}><Trash2 size={20}/></button></>)}
            </div>
        </div>
    );
    
    return (
        <div className="min-h-screen font-sans flex flex-col transition-colors duration-300" style={{ backgroundColor: themeColor, color: textColor }}>
            <PWASetup />
            <header className="p-4 sm:p-6 border-b flex flex-wrap justify-between items-center gap-4 sticky top-0 backdrop-blur-sm z-10" style={{ borderColor: subtleBgColor, backgroundColor: shadeColor(themeColor, -5) + '80' }}>
                <div className="flex items-center gap-3"><img src="/MyLifeDiaryLogo.png" alt="Logo" className="h-10 w-10 rounded-full" /><h1 className="text-3xl font-bold tracking-tight">My Life Diary</h1></div>
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                    <button onClick={() => colorPickerRef.current.click()} className="p-2 rounded-lg" style={{ backgroundColor: subtleBgColor }}><Palette size={20} /></button>
                    <input type="color" ref={colorPickerRef} value={themeColor} onChange={e => setThemeColor(e.target.value)} className="w-0 h-0 opacity-0 absolute"/>
                    <div className="relative"><Languages size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" /><select value={language} onChange={e=>setLanguage(e.target.value)} className="rounded-lg pl-9 pr-4 py-2 appearance-none focus:outline-none text-sm" style={{backgroundColor: subtleBgColor, color: textColor}}><option value="en-US">English</option><option value="fr-FR">Français</option></select></div>
                    {notes.length > 0 && <button onClick={()=>handleDeleteSelection({type:'all'})} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{backgroundColor: subtleBgColor}}><Trash2 size={16}/><span className="hidden sm:inline">Delete All</span></button>}
                    {notes.length === 0 && <button onClick={loadSampleData} disabled={isLoadingSamples} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{backgroundColor: subtleBgColor}}>{isLoadingSamples ? 'Loading...' : <><BookPlus size={16}/><span className="hidden sm:inline">Load Samples</span></>}</button>}
                    <button onClick={()=>signOut(auth)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{backgroundColor: subtleBgColor}}><LogOut size={16}/><span className="hidden sm:inline">Sign Out</span></button>
                </div>
            </header>

            <main className="flex-grow p-4 sm:p-6 overflow-y-auto pb-32"><div className="max-w-3xl mx-auto">
                {firestoreError && <div className="mb-4 bg-red-100/20 border border-red-400 text-red-400 px-4 py-3 rounded-lg"><strong className="font-bold">Database Error! </strong><span className="block sm:inline">{firestoreError}</span></div>}
                <div className="relative mb-6"><Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" size={20}/><input type="text" placeholder="Search notes..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full border rounded-lg py-3 pl-12 pr-4 focus:outline-none focus:ring-2" style={{backgroundColor: subtleBgColor, borderColor: accentColor, ringColor: accentColor}} /></div>
                <h2 className="text-2xl font-semibold border-b-2 pb-2 mb-4" style={{borderColor: accentColor}}>Today</h2>
                <div className="space-y-4">{todayNotes.length > 0 ? todayNotes.map(renderNote) : <p className="opacity-60 text-center py-8">{searchTerm?'No matching notes.':'No entries today.'}</p>}</div>
                {pastNotesRaw.length > 0 && (<div className="mt-12">
                    <button onClick={()=>setShowPastNotes(!showPastNotes)} className="w-full flex justify-between items-center text-left text-2xl font-semibold border-b-2 pb-2 mb-4" style={{borderColor: accentColor}}><span>Past Entries</span>{showPastNotes ? <ChevronUp/> : <ChevronDown/>}</button>
                    {showPastNotes && (<div className="space-y-2 mt-4 pl-2">
                        {Object.keys(structuredPastNotes).sort((a,b)=>b-a).map(year => (<div key={year} className="py-2">
                            <div className="w-full flex items-center justify-between text-left text-xl font-medium"><button onClick={()=>toggleExpand(year)} className="flex items-center flex-grow transition-opacity hover:opacity-80">{expandedItems[year] ? <ChevronUp size={20} className="mr-2"/> : <ChevronDown size={20} className="mr-2"/>}{year}</button><button onClick={()=>handleDeleteSelection({type:'year',year:parseInt(year)})} className="p-1 opacity-50 hover:opacity-100 hover:bg-white/10 rounded-full"><Trash2 size={16}/></button></div>
                            {expandedItems[year] && (<div className="pl-6 mt-2 space-y-2 border-l" style={{borderColor: accentColor}}>
                                {Object.keys(structuredPastNotes[year]).map(month => (<div key={month} className="py-1">
                                    <div className="w-full flex items-center justify-between text-left text-lg font-normal opacity-80"><button onClick={()=>toggleExpand(`${year}-${month}`)} className="flex items-center flex-grow transition-opacity hover:opacity-100">{expandedItems[`${year}-${month}`]?<ChevronUp size={18} className="mr-2"/>:<ChevronDown size={18} className="mr-2"/>}{month}</button><button onClick={()=>handleDeleteSelection({type:'month',year:parseInt(year),month})} className="p-1 opacity-50 hover:opacity-100 hover:bg-white/10 rounded-full"><Trash2 size={16}/></button></div>
                                    {expandedItems[`${year}-${month}`] && (<div className="pl-6 mt-2 space-y-4 border-l" style={{borderColor: accentColor}}>
                                        {Object.keys(structuredPastNotes[year][month]).sort((a,b)=>b-a).map(day => (<div key={day}>
                                            <h4 className="text-md font-semibold mb-2" style={{color: accentColor}}>{month} {day}, {year}</h4>
                                            <div className="space-y-4">{structuredPastNotes[year][month][day].map(renderNote)}</div>
                                        </div>))}
                                    </div>)}
                                </div>))}
                            </div>)}
                        </div>))}
                    </div>)}
                </div>)}
            </div></main>
            
            <footer className="fixed bottom-0 left-0 right-0 p-4 backdrop-blur-lg flex justify-center items-center text-center" style={{backgroundColor: shadeColor(themeColor, -5) + '80' }}>
                {micError ? <p className="text-red-500">{micError}</p> : <button onMouseDown={handleRecordStart} onMouseUp={handleRecordStop} onTouchStart={handleRecordStart} onTouchEnd={handleRecordStop} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105 ${isRecording ? 'animate-pulse !bg-red-600' : ''}`} style={{backgroundColor: accentColor, color: micColor}}><Mic size={40}/></button>}
            </footer>

            {showDeleteConfirm && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="rounded-lg p-6 max-w-sm w-full text-center shadow-2xl" style={{backgroundColor: subtleBgColor, color: textColor}}>
                    <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
                    <p className="opacity-80 mb-6">{confirmText}</p>
                    <div className="flex justify-center gap-4">
                        <button onClick={()=>setShowDeleteConfirm(null)} className="px-6 py-2 rounded-lg transition-opacity hover:opacity-80" style={{backgroundColor: accentColor}}>Cancel</button>
                        <button onClick={handleConfirmDelete} className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors">Delete</button>
                    </div>
                </div>
            </div>)}
        </div>
    );
}

