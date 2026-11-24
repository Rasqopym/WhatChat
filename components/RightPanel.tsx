'use client';

import React, { useState } from 'react';
import { Conversation, Agent, InternalNote } from '@/types';
import { 
  UserCheck, 
  Tag, 
  FileText, 
  Sparkles, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle,
  Loader2,
  Shield,
  User
} from 'lucide-react';

interface RightPanelProps {
  conversation: Conversation | null;
  agents: Agent[];
  currentAgent: Agent;
  notes: InternalNote[];
  onAssignAgent: (agentId: string | null) => void;
  onAddNote: (content: string) => Promise<void>;
  onSummarizeWithAI: () => Promise<string>;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  conversation,
  agents,
  currentAgent,
  notes,
  onAssignAgent,
  onAddNote,
  onSummarizeWithAI,
}) => {
  const isAdmin = currentAgent.role === 'admin';
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'ai'>('details');
  const [newNote, setNewNote] = useState('');
  const [isPostingNote, setIsPostingNote] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  if (!conversation) return null;

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || isPostingNote) return;

    setIsPostingNote(true);
    try {
      await onAddNote(newNote.trim());
      setNewNote('');
    } finally {
      setIsPostingNote(false);
    }
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    try {
      const summary = await onSummarizeWithAI();
      setAiSummary(summary);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col h-full shadow-sm z-10">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 text-xs font-semibold bg-slate-50">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors ${
            activeTab === 'details'
              ? 'border-[#128C7E] text-[#075E54] bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Customer & Assignment
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'notes'
              ? 'border-[#128C7E] text-[#075E54] bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Team Notes</span>
          <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
            {notes.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'ai'
              ? 'border-purple-600 text-purple-700 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-3 h-3 text-purple-600" />
          <span>AI Assist</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'details' && (
          <>
            {/* 1. Multi-Agent Assignment Box */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Assigned Agent</span>
                {conversation.assigned_agent_id !== currentAgent.id && (
                  <button
                    onClick={() => onAssignAgent(currentAgent.id)}
                    className="text-[11px] text-[#128C7E] hover:underline font-semibold cursor-pointer"
                  >
                    Claim / Assign to Me
                  </button>
                )}
              </label>

              <select
                value={conversation.assigned_agent_id || ''}
                onChange={(e) => onAssignAgent(e.target.value ? e.target.value : null)}
                className="w-full text-sm rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-[#128C7E] focus:outline-none cursor-pointer"
              >
                <option value="">⚪ Unassigned (In Public Queue)</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.is_online ? '🟢' : '⚪'} {agent.name} ({agent.role === 'admin' ? 'Admin' : 'Agent'})
                  </option>
                ))}
              </select>

              <div className="text-[11px] text-slate-400">
                {isAdmin ? (
                  <span className="text-purple-700 font-medium flex items-center gap-1">
                    <Shield className="w-3 h-3 text-purple-600" />
                    Admin Override: You can reassign any ticket across all 10 seats
                  </span>
                ) : (
                  <span>Support Agent: You can claim this chat or hand over to a peer</span>
                )}
              </div>
            </div>

            {/* 2. Customer Metadata */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Contact Profile</h3>
              <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block">Name:</span>
                  <span className="font-semibold text-slate-800">{conversation.contact?.name || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">WhatsApp Number:</span>
                  <span className="font-mono text-slate-800">{conversation.contact?.phone_number}</span>
                </div>
              </div>
            </div>

            {/* 3. Customer Tags */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>Customer Tags</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {conversation.contact?.tags?.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Internal Team Notes */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="bg-amber-50 text-amber-900 border border-amber-200/80 p-2.5 rounded-lg text-xs">
              🔒 <strong>Private Team Notes:</strong> Messages posted here are only visible to your 10 agents, never sent to the customer.
            </div>

            {/* New Note Form */}
            <form onSubmit={handlePostNote} className="space-y-2">
              <textarea
                rows={3}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={`Leave a note as ${currentAgent.name}...`}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newNote.trim() || isPostingNote}
                className="w-full py-1.5 bg-[#075E54] hover:bg-[#128C7E] text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isPostingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Save Note as {currentAgent.name}</span>
              </button>
            </form>

            {/* Existing Notes List */}
            <div className="space-y-2.5">
              {notes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No internal notes yet.</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-amber-900">
                      <span>{note.agent_name || 'Teammate'}</span>
                      <span className="text-slate-400 font-normal">
                        {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: AI Co-pilot & Summarization */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg text-xs text-purple-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>AI Handoff Summarizer</span>
              </div>
              <p className="text-purple-700">
                Generate a 3-bullet executive summary before handing off this customer to another teammate.
              </p>
            </div>

            <button
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSummarizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing Chat with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Summary</span>
                </>
              )}
            </button>

            {aiSummary && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2 animate-fade-in">
                <div className="font-bold text-slate-800">Summary:</div>
                <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {aiSummary}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
