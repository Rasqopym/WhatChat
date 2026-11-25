'use client';

import React, { useState } from 'react';
import { Conversation, Agent, Business } from '@/types';
import { Search, UserCheck, AlertCircle, Inbox, Building2 } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  currentAgent: Agent;
  agents: Agent[];
  businesses: Business[];
  selectedBusinessId: string;
  onSelectBusiness: (businessId: string) => void;
  onSelect: (conv: Conversation) => void;
}

type FilterTab = 'all' | 'mine' | 'unassigned' | 'urgent';

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  currentAgent,
  agents,
  businesses,
  selectedBusinessId,
  onSelectBusiness,
  onSelect,
}) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Only show businesses this agent is allowed to access (Admins see all)
  const allowedBusinesses =
    currentAgent.role === 'admin' || !currentAgent.assigned_business_ids?.length
      ? businesses
      : businesses.filter((b) => currentAgent.assigned_business_ids?.includes(b.id));

  const filtered = conversations.filter((conv) => {
    // 1. Agent business permission check
    if (
      currentAgent.role !== 'admin' &&
      currentAgent.assigned_business_ids?.length &&
      conv.business_id &&
      !currentAgent.assigned_business_ids.includes(conv.business_id)
    ) {
      return false;
    }

    // 2. Selected business filter
    if (selectedBusinessId !== 'all' && conv.business_id !== selectedBusinessId) {
      return false;
    }

    // 3. Search query filter
    const searchLower = searchQuery.toLowerCase();
    const contactName = conv.contact?.name?.toLowerCase() || '';
    const phone = conv.contact?.phone_number?.toLowerCase() || '';
    const lastMsg = conv.last_message_text?.toLowerCase() || '';
    const matchesSearch = contactName.includes(searchLower) || phone.includes(searchLower) || lastMsg.includes(searchLower);

    if (!matchesSearch) return false;

    // 4. Tab filter
    if (filterTab === 'mine') return conv.assigned_agent_id === currentAgent.id;
    if (filterTab === 'unassigned') return !conv.assigned_agent_id;
    if (filterTab === 'urgent') return conv.priority === 'urgent';
    return true;
  });

  const getAgentName = (agentId?: string | null) => {
    if (!agentId) return null;
    return agents.find((a) => a.id === agentId)?.name;
  };

  const getBusiness = (businessId?: string | null) => {
    if (!businessId) return null;
    return businesses.find((b) => b.id === businessId) || null;
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col h-full select-none pb-16 md:pb-0">
      {/* Top Business Switcher + Search */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/90 space-y-2.5">
        {/* Multi-Business Switcher */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm">
            <Building2 className="w-4 h-4 text-[#128C7E] flex-shrink-0" />
            <select
              value={selectedBusinessId}
              onChange={(e) => onSelectBusiness(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer truncate"
            >
              <option value="all">🏢 All Businesses ({allowedBusinesses.length})</option>
              {allowedBusinesses.map((biz) => (
                <option key={biz.id} value={biz.id}>
                  ● {biz.name} ({biz.display_phone_number})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search chats, numbers, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#128C7E] focus:border-transparent placeholder:text-slate-400"
          />
        </div>

        {/* Tab Filters */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/70 rounded-xl text-xs font-medium text-slate-600">
          <button
            onClick={() => setFilterTab('all')}
            className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
              filterTab === 'all' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'hover:text-slate-900'
            }`}
          >
            All ({filtered.length})
          </button>
          <button
            onClick={() => setFilterTab('mine')}
            className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
              filterTab === 'mine' ? 'bg-white text-[#075E54] shadow-sm font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Mine
          </button>
          <button
            onClick={() => setFilterTab('unassigned')}
            className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
              filterTab === 'unassigned' ? 'bg-amber-100 text-amber-900 shadow-sm font-semibold' : 'hover:text-amber-800'
            }`}
          >
            Queue
          </button>
          <button
            onClick={() => setFilterTab('urgent')}
            className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
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
            <p className="text-xs text-slate-400 mt-1">Try switching business or filter tabs</p>
          </div>
        ) : (
          filtered.map((conv) => {
            const isSelected = conv.id === selectedId;
            const assignedName = getAgentName(conv.assigned_agent_id);
            const biz = getBusiness(conv.business_id);

            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`p-3.5 cursor-pointer transition-colors relative flex items-start space-x-3 active:bg-emerald-50 ${
                  isSelected ? 'bg-emerald-50/80 md:border-r-4 md:border-r-[#128C7E]' : 'hover:bg-slate-50'
                }`}
              >
                {/* Contact Avatar */}
                <div className="relative flex-shrink-0">
                  {conv.contact?.avatar_url ? (
                    <img
                      src={conv.contact.avatar_url}
                      alt={conv.contact.name || 'Avatar'}
                      className="w-12 h-12 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm">
                      {conv.contact?.name?.[0] || 'C'}
                    </div>
                  )}
                  {conv.priority === 'urgent' && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white" title="Urgent Priority" />
                  )}
                </div>

                {/* Info & Snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5 gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {conv.contact?.name || conv.contact?.phone_number}
                    </h3>
                    <span className="text-[11px] text-slate-400 flex-shrink-0">
                      {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 truncate mb-1.5">
                    {conv.last_message_text || 'No messages yet'}
                  </p>

                  {/* Business Pill + Agent Assignment Badge */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center space-x-1.5 truncate">
                      {biz && (
                        <span
                          style={{ backgroundColor: `${biz.brand_color}18`, color: biz.brand_color, borderColor: `${biz.brand_color}40` }}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded border truncate max-w-[90px]"
                        >
                          {biz.name}
                        </span>
                      )}

                      {assignedName ? (
                        <span className="text-[11px] bg-emerald-100/70 text-emerald-800 font-medium px-1.5 py-0.5 rounded flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-emerald-600" />
                          <span className="truncate max-w-[75px]">{assignedName}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] bg-amber-100 text-amber-800 font-medium px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Queue
                        </span>
                      )}
                    </div>

                    {/* Unread Counter Badge */}
                    {conv.unread_count > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 bg-[#25D366] text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm">
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
