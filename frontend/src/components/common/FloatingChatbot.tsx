import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  Send,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  RotateCcw,
  Shield,
  MapPin,
  AlertTriangle,
  Phone,
  FileText,
  UserCheck,
  ChevronDown,
} from 'lucide-react';

interface ChatAction {
  type: 'redirect' | 'helpline';
  label: string;
  path: string;
  category?: string;
  icon?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: ChatAction;
  quickReplies?: string[];
  timestamp: string;
}

const STARTER_QUICK_REPLIES = [
  '🚨 I want to report a theft',
  '🗺️ Where is the live crime map?',
  '🛡️ How does Safe Escort work?',
  '📞 Official emergency helpline numbers',
  '👤 How to add family emergency contacts?',
];

export function FloatingChatbot() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load message history from sessionStorage or initialize with welcome message
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('trinetra_chat_history');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}

    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content:
          '👋 Hello! I am your **Trinetra AI Guide**.\n\nI can answer questions about the platform, guide you through emergency procedures, or instantly redirect you to reporting, live maps, and safe corridors. How can I help you today?',
        quickReplies: STARTER_QUICK_REPLIES,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  // Save to sessionStorage whenever messages change
  useEffect(() => {
    try {
      sessionStorage.setItem('trinetra_chat_history', JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Scroll to bottom of message list on new messages or open
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setInputMessage('');
    setHasInteracted(true);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build lightweight conversation history
      const history = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.post<{ success: boolean; data: { reply: string; action?: ChatAction; quickReplies?: string[] } }>(
        '/ai/assistant',
        {
          message: text,
          history,
          userRole: user?.role || (isAuthenticated ? 'citizen' : 'guest'),
        }
      );

      if (res.data?.success && res.data.data) {
        const { reply, action, quickReplies } = res.data.data;
        const assistantMessage: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: reply,
          action,
          quickReplies,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch {
      // Fallback response if network or backend times out
      const fallbackMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content:
          'I am here to help you navigate Trinetra. You can file reports, monitor safe corridors, check live maps, or contact emergency helplines.',
        action: {
          type: 'redirect',
          label: '🚨 Open Incident Report Form',
          path: '/citizen/report',
          icon: 'FileText',
        },
        quickReplies: ['Report a Theft', 'Open Live Safety Map', 'Emergency Helplines'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: ChatAction) => {
    // If it's a telephone helpline, trigger dialer
    if (action.path.startsWith('tel:')) {
      window.location.href = action.path;
      return;
    }

    // If target requires citizen auth and user is a guest, intelligently redirect through login
    if (action.path.startsWith('/citizen') && !isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(action.path)}`);
      setIsOpen(false);
      return;
    }

    // Direct routing
    navigate(action.path);
    setIsOpen(false);
  };

  const handleResetChat = () => {
    const welcome: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content:
        'Conversation cleared. How can I assist you with Trinetra public safety services today?',
      quickReplies: STARTER_QUICK_REPLIES,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([welcome]);
  };

  const getActionIcon = (iconName?: string) => {
    switch (iconName) {
      case 'AlertTriangle':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'Map':
        return <MapPin className="w-4 h-4 text-sky-400" />;
      case 'Shield':
        return <Shield className="w-4 h-4 text-emerald-400" />;
      case 'Phone':
        return <Phone className="w-4 h-4 text-rose-400" />;
      case 'User':
        return <UserCheck className="w-4 h-4 text-indigo-400" />;
      default:
        return <FileText className="w-4 h-4 text-brand-400" />;
    }
  };

  return (
    <>
      {/* 1. Floating Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom duration-300">
          {!hasInteracted && (
            <div
              onClick={() => setIsOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-indigo-500/40 text-xs font-semibold text-indigo-200 shadow-xl backdrop-blur-md cursor-pointer hover:border-indigo-400 hover:scale-105 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Need help? Ask Trinetra AI</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              setHasInteracted(true);
            }}
            className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 hover:from-indigo-500 hover:to-sky-300 text-white shadow-2xl flex items-center justify-center p-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 group border border-white/20"
            aria-label="Open Trinetra AI Guide"
          >
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
            <Bot className="w-7 h-7 drop-shadow-md group-hover:scale-110 transition-transform" />
          </button>
        </div>
      )}

      {/* 2. Interactive Glassmorphic Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-2 sm:right-6 z-50 w-[calc(100vw-1rem)] sm:w-[390px] h-[540px] max-h-[82vh] rounded-3xl bg-slate-900/95 border border-indigo-500/40 shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-indigo-950/90 via-slate-900 to-slate-950 border-b border-indigo-900/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300">
                <Bot className="w-5 h-5 text-indigo-400" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white tracking-wide">Trinetra AI Guide</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                    2.5 Flash
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Navigation & Safety Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                title="Reset conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                title="Minimize chat"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 text-xs scrollbar-thin scrollbar-thumb-slate-800">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-800/60 flex items-center justify-center shrink-0 mt-0.5 text-indigo-400">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`space-y-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Message Bubble */}
                  <div
                    className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-md'
                        : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none shadow-inner'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Direct Action Card / Redirection Button */}
                  {msg.action && (
                    <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 space-y-2 shadow-lg animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300">
                        {getActionIcon(msg.action.icon)}
                        <span>Quick Redirect Action</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleActionClick(msg.action!)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
                      >
                        <span className="truncate">{msg.action.label}</span>
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </div>
                  )}

                  {/* Quick Starter Chips */}
                  {msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.quickReplies.map((reply, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(reply)}
                          className="px-2.5 py-1 rounded-full bg-slate-950/60 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-600/50 text-[11px] text-slate-300 hover:text-indigo-200 transition-all cursor-pointer text-left"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[9px] text-slate-500 px-1 block">
                    {msg.timestamp}
                  </span>
                </div>

                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5 text-slate-300">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs pl-8">
                <div className="flex items-center gap-1 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-[10px] text-slate-500">Trinetra AI is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything or e.g. 'I want to report a theft'..."
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition-colors cursor-pointer shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
