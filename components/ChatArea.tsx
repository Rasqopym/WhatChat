'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Conversation, Message, Agent, CannedResponse, MessageMediaType, Business } from '@/types';
import { 
  Send, 
  Sparkles, 
  Paperclip, 
  Check, 
  CheckCheck, 
  Mic, 
  Trash2, 
  Play, 
  Pause, 
  FileText, 
  Phone, 
  User, 
  AlertTriangle,
  Zap,
  Loader2,
  Download,
  X,
  ArrowLeft,
  Info
} from 'lucide-react';

interface ChatAreaProps {
  conversation: Conversation | null;
  business?: Business | null;
  messages: Message[];
  currentAgent: Agent;
  cannedResponses: CannedResponse[];
  onSendMessage: (
    text: string,
    media?: { type: MessageMediaType; url: string; name?: string; duration?: number; base64?: string; mimeType?: string }
  ) => Promise<void>;
  onDraftWithAI: () => Promise<string>;
  onStatusChange: (status: 'open' | 'pending' | 'closed') => void;
  onBackMobile?: () => void;
  onOpenDetailsMobile?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  business,
  messages,
  currentAgent,
  cannedResponses,
  onSendMessage,
  onDraftWithAI,
  onStatusChange,
  onBackMobile,
  onOpenDetailsMobile,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [showCanned, setShowCanned] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // File Attachment State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    previewUrl: string;
    type: MessageMediaType;
  } | null>(null);

  // Image Lightbox State
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  if (!conversation) {
    return (
      <main className="flex-1 bg-[#EFEAE2] flex flex-col items-center justify-center text-slate-500 p-8">
        <div className="w-16 h-16 rounded-full bg-slate-200/80 flex items-center justify-center mb-4 text-slate-400">
          <Phone className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-700">Select a conversation</h2>
        <p className="text-sm text-slate-500 max-w-sm text-center mt-1">
          Pick a customer chat from the left queue to respond or assign to your team.
        </p>
      </main>
    );
  }

  // Helper to convert File to base64 + convert WebP/unsupported images to JPEG for WhatsApp API
  const prepareFileForWhatsApp = (file: File, type: MessageMediaType): Promise<{ base64: string; mimeType: string; dataUrl: string; filename: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const rawDataUrl = reader.result as string;
        if (type === 'image' && file.type !== 'image/jpeg' && file.type !== 'image/png') {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              const jpegUrl = canvas.toDataURL('image/jpeg', 0.88);
              resolve({
                base64: jpegUrl.split(',')[1],
                mimeType: 'image/jpeg',
                dataUrl: jpegUrl,
                filename: file.name.replace(/\.[^/.]+$/, '.jpg'),
              });
              return;
            }
            resolve({ base64: rawDataUrl.split(',')[1], mimeType: file.type, dataUrl: rawDataUrl, filename: file.name });
          };
          img.onerror = () => resolve({ base64: rawDataUrl.split(',')[1], mimeType: file.type, dataUrl: rawDataUrl, filename: file.name });
          img.src = rawDataUrl;
        } else {
          resolve({
            base64: rawDataUrl.split(',')[1],
            mimeType: file.type || 'application/octet-stream',
            dataUrl: rawDataUrl,
            filename: file.name,
          });
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle Text/Media Submit
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !pendingFile) || isSending) return;

    setIsSending(true);
    try {
      if (pendingFile) {
        const prepared = await prepareFileForWhatsApp(pendingFile.file, pendingFile.type);
        await onSendMessage(inputText.trim(), {
          type: pendingFile.type,
          url: prepared.dataUrl,
          name: prepared.filename,
          base64: prepared.base64,
          mimeType: prepared.mimeType,
        });
        setPendingFile(null);
      } else {
        await onSendMessage(inputText.trim());
      }
      setInputText('');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Voice Note Start / Finish
  const startRecording = () => {
    setIsRecording(true);
  };

  const cancelRecording = () => {
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const sendVoiceNote = async () => {
    const duration = recordingDuration || 8;
    setIsRecording(false);
    setIsSending(true);
    try {
      await onSendMessage(`🎤 Voice message (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`, {
        type: 'audio',
        url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
        duration: duration,
      });
    } finally {
      setIsSending(false);
      setRecordingDuration(0);
    }
  };

  // Handle File Selection (Images, Videos, Audio, Documents)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    let mediaType: MessageMediaType = 'document';
    if (file.type.startsWith('image/')) mediaType = 'image';
    else if (file.type.startsWith('video/')) mediaType = 'video';
    else if (file.type.startsWith('audio/')) mediaType = 'audio';

    setPendingFile({
      file,
      previewUrl,
      type: mediaType,
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle AI Draft
  const handleAiDraft = async () => {
    setIsAiDrafting(true);
    try {
      const draft = await onDraftWithAI();
      setInputText(draft);
    } catch (err) {
      console.error('Error generating AI draft:', err);
    } finally {
      setIsAiDrafting(false);
    }
  };

  const handleSelectCanned = (canned: CannedResponse) => {
    setInputText(canned.content);
    setShowCanned(false);
  };

  const toggleAudioPlay = (msgId: string, mediaUrl?: string) => {
    if (playingAudioId === msgId) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      setPlayingAudioId(msgId);
      if (mediaUrl) {
        const audio = new Audio(mediaUrl);
        audioElementRef.current = audio;
        audio.onended = () => setPlayingAudioId(null);
        audio.onerror = () => setPlayingAudioId(null);
        audio.play().catch(() => setPlayingAudioId(null));
      }
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-[#EFEAE2] relative overflow-hidden">
      {/* 1. Header */}
      <div className="h-16 bg-white border-b border-slate-200 px-3 md:px-5 flex items-center justify-between shadow-sm z-10 gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="md:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg flex-shrink-0"
              aria-label="Back to chats"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-700 font-bold border border-slate-300 flex-shrink-0">
            {conversation.contact?.avatar_url ? (
              <img src={conversation.contact.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              conversation.contact?.name?.[0] || <User className="w-5 h-5 text-slate-500" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h2 className="text-sm font-bold text-slate-900 truncate">
                {conversation.contact?.name || conversation.contact?.phone_number}
              </h2>
              {conversation.priority === 'urgent' && (
                <span className="hidden sm:inline-block text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                  Urgent
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <span className="font-mono truncate">{conversation.contact?.phone_number}</span>
              {business && (
                <span
                  style={{ backgroundColor: `${business.brand_color}18`, color: business.brand_color }}
                  className="text-[10px] font-bold px-1.5 py-0.2 rounded truncate"
                >
                  • {business.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Dropdown & Mobile Info Drawer Button */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <select
            value={conversation.status}
            onChange={(e) => onStatusChange(e.target.value as any)}
            className="text-xs font-semibold px-2 md:px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#128C7E]"
          >
            <option value="open">🟢 Open</option>
            <option value="pending">🟡 Pending</option>
            <option value="closed">⚪ Closed</option>
          </select>

          {onOpenDetailsMobile && (
            <button
              onClick={onOpenDetailsMobile}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              title="Customer Info, Assignment & AI"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Collision Warning Banner */}
      {conversation.assigned_agent_id && conversation.assigned_agent_id !== currentAgent.id && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>
              Assigned to a teammate. You can still review or co-reply from this device.
            </span>
          </div>
        </div>
      )}

      {/* 3. Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
        {messages.map((msg) => {
          const isCustomer = msg.sender_type === 'customer';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
            >
              <div
                className={`max-w-[82%] md:max-w-[65%] rounded-xl p-3 text-sm shadow-sm relative ${
                  isCustomer
                    ? 'bg-white text-slate-900 rounded-tl-none'
                    : 'bg-[#DCF8C6] text-slate-900 rounded-tr-none'
                }`}
              >
                {/* Agent Attribution */}
                {!isCustomer && (
                  <div className="text-[11px] font-semibold text-emerald-800 mb-1">
                    {msg.sender_name || 'Agent'}
                  </div>
                )}

                {/* Media: Image Attachment */}
                {msg.media_type === 'image' && msg.media_url && (
                  <div
                    onClick={() => setLightboxUrl(msg.media_url!)}
                    className="mb-2 rounded-lg overflow-hidden border border-black/10 cursor-pointer group relative"
                    title="Click to view full size"
                  >
                    <img
                      src={msg.media_url}
                      alt="Attachment"
                      className="max-h-60 w-full object-cover group-hover:opacity-95 transition-opacity"
                    />
                  </div>
                )}

                {/* Media: Video Attachment */}
                {msg.media_type === 'video' && msg.media_url && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-black/10 bg-black">
                    <video
                      src={msg.media_url}
                      controls
                      className="max-h-60 w-full"
                    />
                  </div>
                )}

                {/* Media: Voice Note Player */}
                {msg.media_type === 'audio' && (
                  <div className="flex items-center space-x-3 py-1 px-2 bg-black/5 rounded-xl mb-1 min-w-[220px]">
                    <button
                      onClick={() => toggleAudioPlay(msg.id, msg.media_url)}
                      className="w-9 h-9 rounded-full bg-[#128C7E] text-white flex items-center justify-center flex-shrink-0 shadow-sm cursor-pointer"
                    >
                      {playingAudioId === msg.id ? (
                        <Pause className="w-4 h-4 fill-white" />
                      ) : (
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      )}
                    </button>

                    {/* Simulated Waveform */}
                    <div className="flex-1 flex items-center space-x-1 h-6">
                      {[40, 70, 30, 90, 60, 100, 40, 80, 50, 90, 60, 30, 75, 45, 85].map((height, i) => (
                        <span
                          key={i}
                          style={{ height: `${height}%` }}
                          className={`w-1 rounded-full transition-all ${
                            playingAudioId === msg.id ? 'bg-[#128C7E] animate-pulse' : 'bg-slate-400'
                          }`}
                        />
                      ))}
                    </div>

                    <span className="text-[11px] font-mono text-slate-600 font-medium">
                      0:{(msg.audio_duration || 12).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}

                {/* Media: Document File */}
                {msg.media_type === 'document' && (
                  <div className="flex items-center space-x-3 p-2.5 bg-black/5 rounded-xl mb-1.5 border border-black/10">
                    <FileText className="w-8 h-8 text-rose-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {msg.media_name || (msg.text?.replace('📄 ', '') || 'Document')}
                      </div>
                      <div className="text-[10px] text-slate-500">Document Attachment</div>
                    </div>
                    {msg.media_url ? (
                      <a
                        href={msg.media_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={msg.media_name || 'document'}
                        className="p-1.5 hover:bg-black/10 rounded-lg text-slate-600 cursor-pointer"
                        title="Open / Download Document"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="p-1.5 text-slate-400" title="Saved without file blob">
                        <Download className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                )}

                {/* Text Content */}
                {msg.text && (
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                )}

                {/* Timestamp and Delivery Checks */}
                <div className="flex items-center justify-end space-x-1 text-[10px] text-slate-500 mt-1">
                  <span>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {!isCustomer && (
                    <span>
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-500 inline" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-slate-400 inline" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-slate-400 inline" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Canned Response Flyout */}
      {showCanned && (
        <div className="absolute bottom-20 left-4 right-4 md:left-6 md:right-96 bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 z-30 animate-fade-in">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /> Canned Quick Replies</span>
            <button onClick={() => setShowCanned(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {cannedResponses.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectCanned(c)}
                className="text-left p-2 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors"
              >
                <div className="text-xs font-semibold text-slate-800 flex items-center space-x-1">
                  <span className="text-[#128C7E] font-mono">{c.shortcut}</span>
                  <span>- {c.title}</span>
                </div>
                <div className="text-xs text-slate-500 truncate mt-0.5">{c.content}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Pending Attachment Preview Bar */}
      {pendingFile && (
        <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {pendingFile.type === 'image' ? (
              <img src={pendingFile.previewUrl} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
            ) : (
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-rose-500" />
              </div>
            )}
            <div>
              <div className="text-xs font-bold text-slate-800 truncate max-w-xs">{pendingFile.file.name}</div>
              <div className="text-[10px] text-slate-400">Ready to send with next message</div>
            </div>
          </div>
          <button onClick={() => setPendingFile(null)} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 6. Active Voice Recording Bar */}
      {isRecording ? (
        <div className="bg-white border-t border-slate-200 p-4 flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-3">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping" />
            <div className="text-sm font-bold text-slate-800 font-mono">
              Recording Voice Note: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={cancelRecording}
              className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex items-center space-x-1 text-xs font-medium"
            >
              <Trash2 className="w-4 h-4" />
              <span>Discard</span>
            </button>

            <button
              onClick={sendVoiceNote}
              className="px-4 py-2 bg-[#128C7E] hover:bg-[#075E54] text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>Send Voice Note</span>
            </button>
          </div>
        </div>
      ) : (
        /* Normal Composer */
        <div className="bg-white border-t border-slate-200 p-3">
          {/* Quick Action Toolbar */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCanned(!showCanned)}
                className="text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Canned (/templates)</span>
              </button>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                className="hidden"
              />

              {/* File Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-colors"
                title="Attach Photo or Document"
              >
                <Paperclip className="w-3.5 h-3.5 text-slate-600" />
                <span>Attach</span>
              </button>
            </div>

            {/* AI Draft Button */}
            <button
              onClick={handleAiDraft}
              disabled={isAiDrafting}
              className="text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              {isAiDrafting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>AI Drafting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Draft Reply with AI</span>
                </>
              )}
            </button>
          </div>

          {/* Input & Send Form */}
          <form onSubmit={handleSend} className="flex items-end space-x-2">
            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-[#128C7E] focus-within:border-transparent p-2">
              <textarea
                rows={2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Reply as ${currentAgent.name}... (Press Enter to send, Shift+Enter for new line)`}
                className="w-full bg-transparent resize-none text-sm text-slate-800 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Mic / Voice Note Button */}
            <button
              type="button"
              onClick={startRecording}
              className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors flex-shrink-0"
              title="Record Voice Message"
            >
              <Mic className="w-5 h-5 text-slate-600" />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!inputText.trim() && !pendingFile) || isSending}
              className="w-11 h-11 rounded-full bg-[#128C7E] hover:bg-[#075E54] text-white flex items-center justify-center transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
            </button>
          </form>
        </div>
      )}

      {/* 7. Full-Screen Image Lightbox Modal */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-end w-full space-x-2 mb-3">
              <a
                href={lightboxUrl}
                download="whatsapp-image"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 backdrop-blur-md"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </a>
              <button
                onClick={() => setLightboxUrl(null)}
                className="p-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg backdrop-blur-md cursor-pointer"
                aria-label="Close image preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={lightboxUrl}
              alt="Full size preview"
              className="max-h-[82vh] max-w-full rounded-xl shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </main>
  );
};
