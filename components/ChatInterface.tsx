
import React, { useState, useEffect, useRef } from 'react';
import { Message, User, Emotion, Exercise } from '../types';
import { processChatMessage } from '../services/unifiedAIService';
import { dbService } from '../services/databaseService';
import WebcamCapture from './WebcamCapture';
import Journal from './Journal';
import ExercisePlayer from './ExercisePlayer';
import { useAuth } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import { COUNTRIES } from '../constants';

interface ChatInterfaceProps {
  user: User;
  onLogout: () => void;
}

const QUICK_ACTIONS = [
  { label: "Anxious 😰", text: "I'm feeling really anxious right now." },
  { label: "Sad 😢", text: "I'm feeling down and sad." },
  { label: "Happy 😊", text: "I'm feeling happy today!" },
  { label: "Tired 😴", text: "I'm just so tired and drained." },
  { label: "Angry 😠", text: "I'm feeling very angry about something." },
  { label: "Lonely 😔", text: "I'm feeling lonely." },
];

const ChatInterface: React.FC<ChatInterfaceProps> = ({ user, onLogout }) => {
  const { updateProfile } = useAuth();
  const { exercises } = useContent();
  const [activeTab, setActiveTab] = useState<'chat' | 'journal' | 'exercises'>('chat');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  
  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>(Emotion.NEUTRAL);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Smart Suggestions
  const [showExerciseSuggestion, setShowExerciseSuggestion] = useState(false);
  const [suggestedEmotionContext, setSuggestedEmotionContext] = useState<Emotion | null>(null);

  // Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [crisisAlertSent, setCrisisAlertSent] = useState(false);
  const [crisisLocationLink, setCrisisLocationLink] = useState<string | null>(null);

  // Profile Edit State
  const [editName, setEditName] = useState(user.name);
  const [editCountry, setEditCountry] = useState(user.country || COUNTRIES[0].name);
  const [editEmergencyName, setEditEmergencyName] = useState(user.emergencyContactName || '');
  const [editEmergencyNumber, setEditEmergencyNumber] = useState(user.emergencyContactNumber || '');

  // Load chat history from DB
  useEffect(() => {
    const loadChat = async () => {
        const history = await dbService.getChatHistory(user.id);
        if (history.length > 0) {
            setMessages(history.map(msg => ({...msg, timestamp: new Date(msg.timestamp)})));
        } else {
            initializeGreeting();
        }
    };
    loadChat();
  }, [user.id]);

  const initializeGreeting = async () => {
    const greeting: Message = {
      id: 'init-1',
      role: 'model',
      text: `Hi ${user.name}, I'm SoulTalk. I'm here to listen like a friend. How are you feeling today?`,
      timestamp: new Date()
    };
    await dbService.saveMessage(user.id, greeting);
    setMessages([greeting]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const handleEmotionDetected = (emotion: Emotion) => {
    setCurrentEmotion(emotion);
    
    // Suggest exercises if user seems stressed
    if ([Emotion.ANXIOUS, Emotion.SAD, Emotion.ANGRY, Emotion.TIRED].includes(emotion)) {
      if (!showExerciseSuggestion && emotion !== suggestedEmotionContext) {
        setShowExerciseSuggestion(true);
        setSuggestedEmotionContext(emotion);
      }
    }
  };

  const getUserLocation = (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve(`https://www.google.com/maps?q=${latitude},${longitude}`);
        },
        () => resolve(null)
      );
    });
  };

  const triggerCrisisMode = async (triggerText: string) => {
      setShowCrisisModal(true);
      if (!crisisAlertSent) {
        const locationLink = await getUserLocation();
        setCrisisLocationLink(locationLink);
        const msgBody = `CRISIS ALERT: ${user.name} may be in danger. Message: "${triggerText}". ${locationLink ? `Location: ${locationLink}` : ''}`;
        console.group("🚨 EMERGENCY NOTIFICATION SYSTEM");
        console.log(`To: ${user.emergencyContactName} (${user.emergencyContactNumber})`);
        console.log(`Body: ${msgBody}`);
        console.groupEnd();
        setCrisisAlertSent(true);
      }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    // Optimistically update UI
    const tempUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: new Date(),
      // We will update these after processing
      emotionContext: currentEmotion
    };

    setMessages(prev => [...prev, tempUserMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Use Unified Service (Local -> Cloud)
      const { response, crisisDetected, sentiment, sentimentScore } = await processChatMessage(tempUserMessage.text, currentEmotion);
      
      // Update the user message with detected sentiment for storage
      const finalUserMessage = {
          ...tempUserMessage,
          sentiment,
          sentimentScore
      };
      await dbService.saveMessage(user.id, finalUserMessage); // Save to DB

      if (crisisDetected) {
          await triggerCrisisMode(finalUserMessage.text);
      }

      const responseMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, responseMessage]);
      await dbService.saveMessage(user.id, responseMessage); // Save to DB

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I'm having trouble connecting right now. Please try again.",
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    await updateProfile({
      name: editName,
      country: editCountry,
      emergencyContactName: editEmergencyName,
      emergencyContactNumber: editEmergencyNumber
    });
    setShowProfileModal(false);
  };

  const getHelplineInfo = () => {
    const countryData = COUNTRIES.find(c => c.name === user.country) || COUNTRIES.find(c => c.code === 'OTHER');
    return countryData;
  };

  if (selectedExercise) {
    return <ExercisePlayer exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />;
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 p-4 shadow-sm flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowProfileModal(true)} className="focus:outline-none transition-transform hover:scale-105">
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-200 overflow-hidden">
                {user.profilePic ? <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover" /> : 'ST'}
             </div>
          </button>
          <div>
            <h1 className="font-semibold text-slate-800">SoulTalk</h1>
            <p className="text-xs text-slate-500">Always here to listen</p>
          </div>
        </div>
        
        {/* Navigation Tabs (Desktop) */}
        <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'chat' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'journal' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Journal
          </button>
          <button
            onClick={() => {
              setActiveTab('exercises');
              setSelectedExercise(null);
            }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'exercises' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Exercises
          </button>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Emotion Status Indicator - Animated */}
          <div className="hidden md:flex items-center bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
             <span className={`w-2 h-2 rounded-full mr-2 transition-colors duration-500 ${currentEmotion !== Emotion.NEUTRAL ? 'bg-green-500' : 'bg-slate-300'}`}></span>
             <span key={currentEmotion} className="text-xs text-slate-600 font-medium animate-pop-in inline-block min-w-[3rem]">
               {currentEmotion !== Emotion.NEUTRAL ? currentEmotion : 'Neutral'}
             </span>
          </div>
          
          <button 
            onClick={onLogout}
            className="text-sm text-slate-500 hover:text-red-500 transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Content Container */}
        <div className="flex-1 flex flex-col relative w-full h-full">
          
          {/* Tabs for Mobile */}
          <div className="md:hidden flex border-b border-slate-200 bg-white">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-sm font-medium text-center ${
                activeTab === 'chat' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('journal')}
              className={`flex-1 py-3 text-sm font-medium text-center ${
                activeTab === 'journal' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'
              }`}
            >
              Journal
            </button>
            <button
              onClick={() => {
                setActiveTab('exercises');
                setSelectedExercise(null);
              }}
              className={`flex-1 py-3 text-sm font-medium text-center ${
                activeTab === 'exercises' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'
              }`}
            >
              Exercises
            </button>
          </div>

          {activeTab === 'chat' && (
             <>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                  {/* Stress Relief Suggestion Banner */}
                  {showExerciseSuggestion && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex justify-between items-center animate-pop-in shadow-sm mx-auto max-w-2xl">
                      <div className="flex items-center gap-3">
                         <div className="bg-white p-2 rounded-full shadow-sm text-indigo-500">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                           </svg>
                         </div>
                         <div>
                            <p className="text-sm font-semibold text-indigo-900">Feeling {suggestedEmotionContext?.toLowerCase()}?</p>
                            <p className="text-xs text-indigo-700">Try a quick exercise to help you relax.</p>
                         </div>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => setShowExerciseSuggestion(false)} className="text-slate-400 hover:text-slate-600 text-xs px-2">Dismiss</button>
                         <button 
                           onClick={() => setActiveTab('exercises')}
                           className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                         >
                           Try Now
                         </button>
                      </div>
                    </div>
                  )}

                  <div className="text-center text-xs text-slate-400 my-4">
                    <p>SoulTalk is an AI, not a human.</p>
                    <p>For emergencies, please call your local emergency number.</p>
                    <p className="opacity-50 mt-1">Local Emotion Analysis Enabled</p>
                  </div>

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : msg.isError 
                              ? 'bg-red-50 text-red-600 border border-red-100 rounded-bl-none'
                              : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <span className={`text-[10px] block mt-2 opacity-70 ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {msg.sentiment && (
                              <span className="ml-2 px-1.5 py-0.5 bg-black/10 rounded text-xs">
                                  {msg.sentiment}
                              </span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start w-full">
                      <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-200">
                  <div className="max-w-4xl mx-auto">
                    {/* Quick Emotional Check-ins */}
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2 no-scrollbar">
                      {QUICK_ACTIONS.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInputText(action.text)}
                          className="whitespace-nowrap px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-xs rounded-full border border-slate-200 transition-colors flex-shrink-0"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3 items-end">
                      {/* Attachment Button (UI Placeholder) */}
                      <button
                        type="button"
                        className="p-3 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-colors"
                        title="Upload Image"
                        disabled={isLoading}
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                        </svg>
                      </button>

                      <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
                        disabled={isLoading}
                      />
                      
                      <button
                        type="submit"
                        disabled={isLoading || !inputText.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                      </button>
                    </form>
                  </div>
                </div>
             </>
          )}

          {activeTab === 'journal' && (
            <div className="flex-1 overflow-hidden">
               <Journal user={user} />
            </div>
          )}

          {activeTab === 'exercises' && (
             <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-pop-in">
                <div className="max-w-4xl mx-auto">
                   <h2 className="text-2xl font-bold text-slate-800 mb-2">Mindfulness Exercises</h2>
                   <p className="text-slate-500 mb-8">Simple techniques to ground yourself and reduce stress.</p>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {exercises.map(exercise => (
                         <button
                           key={exercise.id}
                           onClick={() => setSelectedExercise(exercise)}
                           className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-left hover:border-indigo-300 hover:shadow-md transition-all group"
                         >
                            <div className="flex justify-between items-start mb-4">
                               <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                                  exercise.category === 'Breathing' ? 'bg-cyan-50 text-cyan-600' :
                                  exercise.category === 'Grounding' ? 'bg-amber-50 text-amber-600' :
                                  exercise.category === 'Physical' ? 'bg-rose-50 text-rose-600' :
                                  'bg-purple-50 text-purple-600'
                               }`}>
                                  {exercise.category}
                               </span>
                               <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {exercise.duration}
                               </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{exercise.title}</h3>
                            <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{exercise.description}</p>
                         </button>
                      ))}
                   </div>
                </div>
             </div>
          )}
        </div>

        {/* Desktop Sidebar: Webcam */}
        <div className="hidden lg:block w-72 bg-white border-l border-slate-200 p-4 space-y-6">
           <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Emotion AI</h3>
              <WebcamCapture 
                onEmotionDetected={handleEmotionDetected}
                isChatActive={activeTab === 'chat'} 
              />
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                SoulTalk uses your camera to detect your emotional state using <b>local AI models</b> first, ensuring privacy and speed.
              </p>
           </div>
           
           <div className="border-t border-slate-100 pt-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Helplines</h3>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                 <p className="text-xs font-bold text-slate-600 mb-1">{getHelplineInfo()?.name} Helplines</p>
                 <div className="flex items-center gap-2 text-indigo-600 font-bold mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    {getHelplineInfo()?.helpline}
                 </div>
                 <p className="text-[10px] text-slate-500">{getHelplineInfo()?.helplineName}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-pop-in">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Your Profile</h2>
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-medium text-slate-500">Name</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-sm"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-medium text-slate-500">Country</label>
                    <select
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                      className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                      {COUNTRIES.map(c => (
                        <option key={c.code} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                 </div>
                 <div className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                    <p className="text-xs font-bold text-rose-600 mb-2">Emergency Contact</p>
                    <div className="space-y-2">
                       <input 
                         type="text" 
                         value={editEmergencyName}
                         onChange={(e) => setEditEmergencyName(e.target.value)}
                         placeholder="Name"
                         className="w-full p-2 border border-rose-200 rounded-lg text-sm"
                       />
                       <input 
                         type="tel" 
                         value={editEmergencyNumber}
                         onChange={(e) => setEditEmergencyNumber(e.target.value)}
                         placeholder="Number"
                         className="w-full p-2 border border-rose-200 rounded-lg text-sm"
                       />
                    </div>
                 </div>
              </div>
              <div className="flex gap-3 mt-6">
                 <button 
                   onClick={() => setShowProfileModal(false)}
                   className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-slate-50"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleUpdateProfile}
                   className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                 >
                   Save Changes
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Crisis Modal */}
      {showCrisisModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-red-900/40 backdrop-blur-md p-4">
           <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-pop-in text-center border-t-4 border-red-500">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                 🆘
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">We are here for you</h2>
              <p className="text-slate-600 text-sm mb-6">
                 It sounds like you're going through a very difficult time. Please reach out to someone who can help immediately.
              </p>
              
              <div className="space-y-3">
                 <a 
                   href={`tel:${getHelplineInfo()?.helpline}`}
                   className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-red-200"
                 >
                   Call {getHelplineInfo()?.helplineName}
                 </a>
                 <button 
                   onClick={() => setShowCrisisModal(false)}
                   className="block w-full py-3 text-sm text-slate-500 hover:text-slate-700 underline"
                 >
                   I'm safe, continue chat
                 </button>
              </div>
              
              {crisisAlertSent && (
                 <p className="text-[10px] text-slate-400 mt-4">
                    Automated safety alert sent to emergency contact.
                 </p>
              )}
           </div>
        </div>
      )}

    </div>
  );
};

export default ChatInterface;
