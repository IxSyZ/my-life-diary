import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
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
import { Mic, Trash2, Edit, Save, X, ChevronDown, ChevronUp, Languages, Search, Sun, Moon, LogOut } from 'lucide-react';

// --- PWA Setup ---
// This effect runs once to set up the PWA capabilities. No changes needed here.
const PWASetup = () => {
    useEffect(() => {
        // 1. Create and inject the Web App Manifest
        const manifest = {
            short_name: "Life Diary",
            name: "My Life Diary",
            icons: [
                {
                    src: "https://placehold.co/192x192/8b5cf6/ffffff?text=Diary",
                    type: "image/png",
                    sizes: "192x192"
                },
                {
                    src: "https://placehold.co/512x512/8b5cf6/ffffff?text=Diary",
                    type: "image/png",
                    sizes: "512x512"
                }
            ],
            start_url: ".",
            display: "standalone",
            theme_color: "#111827",
            background_color: "#111827"
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


        // 2. Register the Service Worker
        const serviceWorkerCode = `
            self.addEventListener('fetch', () => { /* no-op */ });
        `;

        if ('serviceWorker' in navigator) {
            const swBlob = new Blob([serviceWorkerCode], { type: 'application/javascript' });
            const swUrl = URL.createObjectURL(swBlob);
            navigator.serviceWorker.register(swUrl)
                .then(registration => {
                    console.log('ServiceWorker registration successful');
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        }

    }, []);

    return null;
};


// --- Firebase Configuration ---
let firebaseConfig;
let configError = null;

try {
    // This will throw an error in non-Vite environments (like the preview), which is caught below.
    const configString = import.meta.env.VITE_FIREBASE_CONFIG; 
    if (!configString || configString === 'undefined') {
         throw new Error("VITE_FIREBASE_CONFIG is not defined in the environment. Please set it in Vercel.");
    }
    firebaseConfig = JSON.parse(configString);
} catch (e) {
    // We are likely in the preview environment, so let's try the global variable.
    console.log("Could not find Vercel env variables, attempting to use preview config.");
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
        try {
            firebaseConfig = JSON.parse(__firebase_config);
        } catch (parseError) {
             console.error("Firebase config (preview) parse error:", parseError);
             configError = "Could not parse the Firebase configuration provided in the preview environment.";
             firebaseConfig = { apiKey: "error", authDomain: "error", projectId: "error" };
        }
    } else {
        // Neither method worked.
        console.error("Firebase config error: Neither Vercel env nor preview config found.", e);
        configError = "Could not load Firebase configuration. Please ensure the VITE_FIREBASE_CONFIG environment variable is set correctly in your hosting provider (Vercel).";
        firebaseConfig = { apiKey: "error", authDomain: "error", projectId: "error" };
    }
}


// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- SignIn Component ---
const SignIn = () => {
    const signInWithGoogle = () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
            .catch((error) => {
                console.error("Google Sign-In error", error);
                alert("Sign-in failed. Make sure your domain is authorized in Firebase. Error: " + error.message);
            });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-center p-4">
             <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-4">
                My Life Diary
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">Your personal voice-powered journal.</p>
            <button
                onClick={signInWithGoogle}
                className="flex items-center gap-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
                <svg className="w-6 h-6" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                Sign in with Google
            </button>
        </div>
    );
};


// --- Main App Component ---
export default function App() {
    const [notes, setNotes] = useState([]);
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [editingNote, setEditingNote] = useState(null);
    const [editText, setEditText] = useState("");
    const [showPastNotes, setShowPastNotes] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [micError, setMicError] = useState('');
    const [language, setLanguage] = useState('en-US');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedItems, setExpandedItems] = useState({});
    const [theme, setTheme] = useState('dark');

    const recognitionRef = useRef(null);
    const transcriptRef = useRef("");

    // --- Theme Management ---
    useEffect(() => {
        const savedTheme = localStorage.getItem('life-diary-theme') || 'dark';
        setTheme(savedTheme);
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'light') {
            root.classList.remove('dark');
        } else {
            root.classList.add('dark');
        }
        localStorage.setItem('life-diary-theme', theme);
    }, [theme]);

    // --- Authentication ---
    useEffect(() => {
        if (configError) {
            setAuthReady(true);
            return;
        };
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    // --- Firestore Data Fetching ---
    useEffect(() => {
        if (!user || configError) {
            setNotes([]);
            return;
        };
        // This path is now simpler and doesn't rely on a special appId
        const notesCollectionPath = `users/${user.uid}/notes`;
        const q = query(collection(db, notesCollectionPath));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));
            setNotes(notesData);
        }, (error) => {
            console.error("Error fetching notes:", error);
        });

        return () => unsubscribe();
    }, [user]);
    
    // --- Speech Recognition Setup ---
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            const errorMsg = "Speech recognition is not supported in this browser.";
            setMicError(errorMsg);
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = language;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            transcriptRef.current = transcript;
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setMicError(`Speech recognition error: ${event.error}`);
            setIsRecording(false);
        };
        
        recognition.onend = () => {
            setIsRecording(false);
            if (transcriptRef.current.trim()) {
                addNote(transcriptRef.current);
            }
        };

        recognitionRef.current = recognition;
    }, [user, language]);


    // --- Search Expansion Effect ---
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setExpandedItems({}); 
            return;
        }
        const pastMatchingNotes = notes.filter(note => 
            note.text.toLowerCase().includes(searchTerm.toLowerCase()) &&
            note.timestamp && note.timestamp.toDate().toDateString() !== new Date().toDateString()
        );

        if (pastMatchingNotes.length > 0) {
            setShowPastNotes(true);
        }

        const newExpanded = {};
        pastMatchingNotes.forEach(note => {
            const date = note.timestamp.toDate();
            const year = date.getFullYear();
            const month = date.toLocaleString('default', { month: 'long' });
            newExpanded[year] = true;
            newExpanded[`${year}-${month}`] = true;
        });
        setExpandedItems(newExpanded);

    }, [searchTerm, notes]);


    // --- Note Management Functions ---
    const addNote = async (text) => {
        if (!user || !text.trim()) return;
        const notesCollectionPath = `users/${user.uid}/notes`;
        try {
            await addDoc(collection(db, notesCollectionPath), {
                text: text.trim(),
                timestamp: Timestamp.now()
            });
        } catch (error) {
            console.error("Error adding note:", error);
        }
    };
    
    const deleteNote = async (id) => {
        if (!user) return;
        const noteDocPath = `users/${user.uid}/notes/${id}`;
        try {
            await deleteDoc(doc(db, noteDocPath));
        } catch (error) {
            console.error("Error deleting note:", error);
        }
    };

    const deleteAllNotes = () => {
        setShowDeleteConfirm(true);
    };

    const handleConfirmDeleteAll = async () => {
        if (!user) return;
        const notesCollectionPath = `users/${user.uid}/notes`;
        const q = query(collection(db, notesCollectionPath));
        
        try {
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error deleting all notes:", error);
        }
        setShowDeleteConfirm(false);
    };

    const startEditing = (note) => {
        setEditingNote(note);
        setEditText(note.text);
    };

    const saveEdit = async () => {
        if (!user || !editingNote) return;
        const noteDocPath = `users/${user.uid}/notes/${editingNote.id}`;
        try {
            await updateDoc(doc(db, noteDocPath), {
                text: editText
            });
            setEditingNote(null);
            setEditText("");
        } catch (error) {
            console.error("Error updating note:", error);
        }
    };

    // --- Recording Handlers ---
    const handleRecordStart = () => {
        if (micError || !recognitionRef.current) return;
        transcriptRef.current = "";
        setIsRecording(true);
        recognitionRef.current.start();
    };

    const handleRecordStop = () => {
        if (micError || !recognitionRef.current || !isRecording) return;
        recognitionRef.current.stop();
    };
    
    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const toggleExpand = (key) => {
        setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
    };
    
    // --- UI Grouping and Filtering ---
    const filteredNotes = notes.filter(note => 
        note.text.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const today = new Date();
    const todayString = today.toDateString();

    const todayNotes = filteredNotes.filter(note => note.timestamp && note.timestamp.toDate().toDateString() === todayString);
    const pastNotesRaw = filteredNotes.filter(note => note.timestamp && note.timestamp.toDate().toDateString() !== todayString);

    const structuredPastNotes = pastNotesRaw.reduce((acc, note) => {
        if (!note.timestamp) return acc;
        const date = note.timestamp.toDate();
        const year = date.getFullYear();
        const month = date.toLocaleString('default', { month: 'long' });
        const day = date.getDate();

        if (!acc[year]) acc[year] = {};
        if (!acc[year][month]) acc[year][month] = {};
        if (!acc[year][month][day]) acc[year][month][day] = [];
        
        acc[year][month][day].push(note);
        return acc;
    }, {});
    
    // --- Render Helper ---
    const renderNote = (note) => (
        <div key={note.id} className="bg-white dark:bg-white/10 p-4 rounded-lg flex justify-between items-start gap-4 break-words shadow-sm dark:shadow-none">
            <div className="flex-grow">
                 {editingNote && editingNote.id === note.id ? (
                    <textarea 
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-transparent text-gray-800 dark:text-white border-b-2 border-blue-400 focus:outline-none"
                    />
                ) : (
                    <p className="text-gray-800 dark:text-white text-lg">{note.text}</p>
                )}
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                    {note.timestamp ? note.timestamp.toDate().toLocaleString() : 'Just now'}
                </p>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
                {editingNote && editingNote.id === note.id ? (
                    <>
                        <button onClick={saveEdit} className="p-2 text-green-400 hover:text-green-300 transition-colors"><Save size={20} /></button>
                        <button onClick={() => setEditingNote(null)} className="p-2 text-red-400 hover:text-red-300 transition-colors"><X size={20} /></button>
                    </>
                ) : (
                    <>
                        <button onClick={() => startEditing(note)} className="p-2 text-blue-400 hover:text-blue-300 transition-colors"><Edit size={20} /></button>
                        <button onClick={() => deleteNote(note.id)} className="p-2 text-red-400 hover:text-red-300 transition-colors"><Trash2 size={20} /></button>
                    </>
                )}
            </div>
        </div>
    );
    
    if (configError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-center p-4">
                 <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative max-w-lg">
                    <strong className="font-bold">Configuration Error!</strong>
                    <span className="block sm:inline ml-2">{configError}</span>
                </div>
            </div>
        );
    }
    
    if (!authReady) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">Loading...</div>;
    }

    if (!user) {
        return <SignIn />;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white font-sans flex flex-col transition-colors duration-300">
            <PWASetup />
            <header className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm z-10">
                <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">My Life Diary</h1>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleTheme}
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <div className="relative">
                        <Languages size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="bg-gray-200 dark:bg-gray-800/50 text-gray-800 dark:text-white rounded-lg pl-9 pr-4 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                        >
                            <option value="en-US">English</option>
                            <option value="fr-FR">Français</option>
                        </select>
                    </div>
                     {notes.length > 0 && (
                        <button 
                            onClick={deleteAllNotes}
                            className="flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-all"
                        >
                            <Trash2 size={16} />
                            Delete All
                        </button>
                    )}
                    <button
                        onClick={() => signOut(auth)}
                        className="flex items-center gap-2 bg-gray-500/20 text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-500/30 transition-all"
                    >
                       <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </header>

            <main className="flex-grow p-6 overflow-y-auto pb-32">
                 <div className="max-w-3xl mx-auto">
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                        <input 
                            type="text"
                            placeholder="Search notes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-lg py-3 pl-12 pr-4 text-gray-800 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>

                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 border-b-2 border-blue-500/50 pb-2 mb-4">Today</h2>
                    <div className="space-y-4">
                        {todayNotes.length > 0 ? (
                            todayNotes.map(renderNote)
                        ) : (
                            <p className="text-gray-500 text-center py-8">{searchTerm ? 'No matching notes found for today.' : 'No entries for today. Hold the mic to start recording your thoughts!'}</p>
                        )}
                    </div>
                    
                    {pastNotesRaw.length > 0 && (
                         <div className="mt-12">
                            <button onClick={() => setShowPastNotes(!showPastNotes)} className="w-full flex justify-between items-center text-left text-2xl font-semibold text-gray-700 dark:text-gray-300 border-b-2 border-blue-500/50 pb-2 mb-4">
                                <span>Past Entries</span>
                                {showPastNotes ? <ChevronUp/> : <ChevronDown />}
                            </button>
                            {showPastNotes && (
                                <div className="space-y-2 mt-4 pl-2">
                                     {Object.keys(structuredPastNotes).sort((a,b) => b-a).map(year => (
                                        <div key={year} className="py-2">
                                            <button onClick={() => toggleExpand(year)} className="w-full flex items-center text-left text-xl font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors">
                                                {expandedItems[year] ? <ChevronUp size={20} className="mr-2"/> : <ChevronDown size={20} className="mr-2"/>}
                                                {year}
                                            </button>
                                            {expandedItems[year] && (
                                                <div className="pl-6 mt-2 space-y-2 border-l border-gray-300 dark:border-gray-700">
                                                    {Object.keys(structuredPastNotes[year]).map(month => (
                                                        <div key={month} className="py-1">
                                                            <button onClick={() => toggleExpand(`${year}-${month}`)} className="w-full flex items-center text-left text-lg font-normal text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                                                                {expandedItems[`${year}-${month}`] ? <ChevronUp size={18} className="mr-2"/> : <ChevronDown size={18} className="mr-2"/>}
                                                                {month}
                                                            </button>
                                                            {expandedItems[`${year}-${month}`] && (
                                                                <div className="pl-6 mt-2 space-y-4 border-l border-gray-400 dark:border-gray-600">
                                                                    {Object.keys(structuredPastNotes[year][month]).sort((a,b) => b-a).map(day => (
                                                                        <div key={day}>
                                                                            <h4 className="text-md font-semibold text-blue-400 mb-2">{month} {day}, {year}</h4>
                                                                             <div className="space-y-4">
                                                                                {structuredPastNotes[year][month][day].map(renderNote)}
                                                                             </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                 </div>
            </main>
            
            <footer className="fixed bottom-0 left-0 right-0 p-4 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-lg flex justify-center items-center text-center">
                {micError ? (
                    <p className="text-red-400">{micError}</p>
                ) : (
                    <button
                        onMouseDown={handleRecordStart}
                        onMouseUp={handleRecordStop}
                        onTouchStart={handleRecordStart}
                        onTouchEnd={handleRecordStop}
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 text-white shadow-lg
                            ${isRecording 
                                ? 'bg-red-600 animate-pulse shadow-red-500/50' 
                                : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:scale-105'
                            }`}
                    >
                        <Mic size={40} />
                    </button>
                )}
            </footer>

            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full text-center shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Confirm Deletion</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to delete all your notes? This action cannot be undone.</p>
                        <div className="flex justify-center gap-4">
                            <button 
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-6 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmDeleteAll}
                                className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                            >
                                Delete All
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

