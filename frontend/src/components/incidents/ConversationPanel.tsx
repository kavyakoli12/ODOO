import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageCircle, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { initSocket, joinConversationRoom, leaveConversationRoom } from '@/lib/socket';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  isInternalNote: boolean;
  createdAt: string;
}

interface ConversationPanelProps {
  incidentId: string;
  /** If true, shows internal note toggle for officers */
  showInternalNoteToggle?: boolean;
}

export function ConversationPanel({ incidentId, showInternalNoteToggle = false }: ConversationPanelProps) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get(`/messages/${incidentId}`);
      if (res.data.success) {
        setMessages(res.data.messages || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time socket subscription
  useEffect(() => {
    const socket = initSocket();
    joinConversationRoom(incidentId);

    const handleNewMessage = (msg: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
      leaveConversationRoom(incidentId);
    };
  }, [incidentId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || isSending) return;

    setIsSending(true);
    try {
      const res = await api.post(`/messages/${incidentId}`, {
        content,
        isInternalNote: isInternalNote && showInternalNoteToggle,
      });
      if (res.data.success) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === res.data.message.id)) return prev;
          return [...prev, res.data.message];
        });
        setInputValue('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isOwnMessage = (msg: Message) => msg.senderId === user?.id;
  const isAuthority = (role: string) => role === 'officer' || role === 'admin';

  return (
    <div className="flex flex-col h-full min-h-[420px] rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
        <div className="p-1.5 rounded-lg bg-brand-500/15 text-brand-400">
          <MessageCircle className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Conversation</h3>
          <p className="text-[11px] text-slate-400">Secure messaging for this report</p>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading messages…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-rose-400 text-sm py-4">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500 py-8">
            <MessageCircle className="w-8 h-8 opacity-30" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs text-slate-600">Start the conversation below</p>
          </div>
        ) : (
          messages.map((msg) => {
            const own = isOwnMessage(msg);
            const authority = isAuthority(msg.senderRole);
            const internal = msg.isInternalNote;

            return (
              <div key={msg.id} className={`flex flex-col ${own ? 'items-end' : 'items-start'}`}>
                {internal && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-500/70 mb-1 px-1">
                    <Lock className="w-3 h-3" />
                    Internal note — not visible to citizen
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-md ${
                    internal
                      ? 'bg-amber-900/30 border border-amber-600/30 text-amber-100 rounded-br-sm'
                      : own
                      ? 'bg-brand-600 text-white rounded-br-sm'
                      : authority
                      ? 'bg-slate-700 text-white rounded-bl-sm border border-slate-600/50'
                      : 'bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700/50'
                  }`}
                >
                  {!own && (
                    <div className={`text-[10px] font-semibold mb-1 ${authority ? 'text-brand-400' : 'text-emerald-400'}`}>
                      {msg.senderName} · {authority ? '🛡️ Authority' : '👤 Citizen'}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">
                  {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700/50 bg-slate-800/30 p-3">
        {showInternalNoteToggle && (
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setIsInternalNote((v) => !v)}
              className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                isInternalNote
                  ? 'bg-amber-900/30 border-amber-600/40 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Lock className="w-3 h-3" />
              {isInternalNote ? 'Internal note (officer only)' : 'Send as public message'}
            </button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 text-white text-sm px-3 py-2.5 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            id="conversation-send-btn"
            className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all active:scale-95 shadow-lg shadow-brand-600/30"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5 text-right">Shift+Enter for new line</p>
      </div>
    </div>
  );
}
