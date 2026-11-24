'use client';

import React, { useState } from 'react';
import { Conversation, Agent } from '@/types';
import { Search, UserCheck, AlertCircle, Clock, Filter, Inbox } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  currentAgent: Agent;
  agents: Agent[];
  onSelect: (conv: Conversation) => void;
}

type FilterTab = 'all' | 'mine' | 'unassigned' | 'urgent';

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  currentAgent,
  agents,
  onSelect,
}) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = conversations.filter((conv) => {
    // Search query filter
    const searchLower = searchQuery.toLowerCase();
    const contactName = conv.contact?.name?.toLowerCase() || '';
    const phone = conv.contact?.phone_number?.toLowerCase() || '';
    const lastMsg = conv.last_message_text?.toLowerCase() || '';
    const matchesSearch = contactName.includes(searchLower) || phone.includes(searchLower) || lastMsg.includes(searchLower);

    if (!matchesSearch) return false;

    // Tab filter
    if (filterTab === 'mine') return conv.assigned_agent_id === currentAgent.id;
    if (filterTab === 'unassigned') return !conv.assigned_agent_id;
    if (filterTab === 'urgent') return conv.priority === 'urgent';
    return true;
  });

  const getAgentName = (agentId?: string | null) => {
    if (!agentId) return null;
    return agents.find((a) => a.id === agentId)?.name;
  };

  return (
    <aside className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col h-full select-none">
      {/* Search and Filters Header */}
      <div className="p-3 border-b border-slate-100 bg-slate-50 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search chats, numbers, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#128C7E] focus:border-transparent placeholder:text-slate-400"
          />
        </div>

        {/* Tab Filters */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/70 rounded-lg text-xs font-medium text-slate-600">
          <button
            onClick={() => setFilterTab('all')}
            className={`py-1 rounded text-center transition-all ${
              filterTab === 'all' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'hover:text-slate-900'
            }`}
          >
            All ({conversations.length})
          </button>
          <button
            onClick={() => setFilterTab('mine')}
            className={`py-1 rounded text-center transition-all ${
              filterTab === 'mine' ? 'bg-white text-[#075E54] shadow-sm font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Mine ({conversations.filter(c => c.assigned_agent_id === currentAgent.id).length})
          </button>
          <button
            onClick={() => setFilterTab('unassigned')}
            className={`py-1 rounded text-center transition-all ${
              filterTab === 'unassigned' ? 'bg-amber-100 text-amber-900 shadow-sm font-semibold' : 'hover:text-amber-800'
            }`}
          >
            Queue ({conversations.filter(c => !c.assigned_agent_id).length})
          </button>
          <button
            onClick={() => setFilterTab('urgent')}
            className={`py-1 rounded text-center transition-all ${
              filterTab === 'urgent' ? 'bg-rose-100 text-rose-900 shadow-sm font-semibold' : 'hover:text-rose-800'
            }`}
          >
            Urgent
          </button>
        </div>
      </div>

      {/* Conversations Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center">
            <Inbox className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm font-medium">No conversations found</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting search or filter tabs</p>
          </div>
        ) : (
          filtered.map((conv) => {
            const isSelected = conv.id === selectedId;
            const assignedName = getAgentName(conv.assigned_agent_id);

            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`p-3.5 cursor-pointer transition-colors relative flex items-start space-x-3 ${
                  isSelected ? 'bg-emerald-50/80 border-r-4 border-r-[#128C7E]' : 'hover:bg-slate-50'
                }`}
              >
                {/* Contact Avatar */}
                <div className="relative flex-shrink-0">
                  {conv.contact?.avatar_url ? (
                    <img
                      src={conv.contact.avatar_url}
                      alt={conv.contact.name || 'Avatar'}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm">
                      {conv.contact?.name?.[0] || 'C'}
                    </div>
                  )}
                  {conv.priority === 'urgent' && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white" title="Urgent Priority" />
                  )}
                </div>

                {/* Info & Snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {conv.contact?.name || conv.contact?.phone_number}
                    </h3>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 truncate mb-1.5">
                    {conv.last_message_text || 'No messages yet'}
                  </p>

                  {/* Metadata Tags & Agent Assignment Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 truncate">
                      {assignedName ? (
                        <span className="text-[11px] bg-emerald-100/70 text-emerald-800 font-medium px-2 py-0.5 rounded flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-emerald-600" />
                          <span className="truncate max-w-[80px]">{assignedName}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Unassigned
                        </span>
                      )}

                      {conv.contact?.tags?.[0] && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {conv.contact.tags[0]}
                        </span>
                      )}
                    </div>

                    {/* Unread Counter Badge */}
                    {conv.unread_count > 0 && (
                      <span className="w-5 h-5 bg-[#25D366] text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
