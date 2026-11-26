'use client';

import React, { useMemo } from 'react';
import { Agent, Conversation, Message } from '@/types';
import { 
  Users, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  UserCheck,
  Award,
  ArrowRight,
  User,
  Shield,
  Zap
} from 'lucide-react';

interface AnalyticsDashboardProps {
  agents: Agent[];
  conversations: Conversation[];
  messagesMap?: Record<string, Message[]>;
  currentAgent: Agent;
  onOpenConversation?: (convId: string) => void;
}

function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '—';
  const totalSecs = Math.max(0, Math.round(ms / 1000));
  if (totalSecs < 60) return `${totalSecs}s`;
  if (totalSecs < 3600) return `${Math.floor(totalSecs / 60)}m ${totalSecs % 60}s`;
  return `${Math.floor(totalSecs / 3600)}h ${Math.floor((totalSecs % 3600) / 60)}m`;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  agents,
  conversations,
  messagesMap = {},
  currentAgent,
  onOpenConversation,
}) => {
  const isAdmin = currentAgent.role === 'admin';

  // Calculations for Admin View
  const onlineAgents = agents.filter((a) => a.is_online).length;
  const openChats = conversations.filter((c) => c.status === 'open').length;
  const unassignedChats = conversations.filter((c) => !c.assigned_agent_id).length;
  const urgentChats = conversations.filter((c) => c.priority === 'urgent').length;

  // Calculations for Individual Support Agent View
  const myAssignedChats = conversations.filter((c) => c.assigned_agent_id === currentAgent.id);
  const myUrgentChats = myAssignedChats.filter((c) => c.priority === 'urgent');

  // Real response-time & handled calculations derived from actual messages
  const {
    overallAvgFirstResponseMs,
    respondedConversationsCount,
    botReplyCount,
    agentStatsMap,
  } = useMemo(() => {
    const firstResponseDiffs: number[] = [];
    let botCount = 0;
    const perAgentResponseDiffs: Record<string, number[]> = {};
    const perAgentHandledSet: Record<string, Set<string>> = {};

    for (const agent of agents) {
      perAgentResponseDiffs[agent.id] = [];
      perAgentHandledSet[agent.id] = new Set();
    }

    for (const conv of conversations) {
      if (conv.assigned_agent_id && conv.status === 'closed') {
        if (!perAgentHandledSet[conv.assigned_agent_id]) {
          perAgentHandledSet[conv.assigned_agent_id] = new Set();
        }
        perAgentHandledSet[conv.assigned_agent_id].add(conv.id);
      }

      const msgs = [...(messagesMap[conv.id] || [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      let firstCustomerAt: number | null = null;
      let recordedFirstReply = false;
      let pendingCustomerAt: number | null = null;

      for (const msg of msgs) {
        const ts = new Date(msg.created_at).getTime();
        if (msg.sender_type === 'bot') {
          botCount += 1;
        }

        if (msg.sender_type === 'customer') {
          if (firstCustomerAt === null) firstCustomerAt = ts;
          if (pendingCustomerAt === null) pendingCustomerAt = ts;
        } else if (msg.sender_type === 'agent' || msg.sender_type === 'bot') {
          if (!recordedFirstReply && firstCustomerAt !== null && ts >= firstCustomerAt) {
            firstResponseDiffs.push(ts - firstCustomerAt);
            recordedFirstReply = true;
          }

          if (msg.sender_type === 'agent' && msg.sender_id) {
            if (!perAgentHandledSet[msg.sender_id]) {
              perAgentHandledSet[msg.sender_id] = new Set();
            }
            perAgentHandledSet[msg.sender_id].add(conv.id);

            if (pendingCustomerAt !== null && ts >= pendingCustomerAt) {
              if (!perAgentResponseDiffs[msg.sender_id]) {
                perAgentResponseDiffs[msg.sender_id] = [];
              }
              perAgentResponseDiffs[msg.sender_id].push(ts - pendingCustomerAt);
              pendingCustomerAt = null;
            }
          }
        }
      }
    }

    const avgMs =
      firstResponseDiffs.length > 0
        ? firstResponseDiffs.reduce((sum, v) => sum + v, 0) / firstResponseDiffs.length
        : null;

    const statsMap: Record<string, { handledCount: number; avgResponseMs: number | null }> = {};
    for (const agent of agents) {
      const diffs = perAgentResponseDiffs[agent.id] || [];
      statsMap[agent.id] = {
        handledCount: perAgentHandledSet[agent.id]?.size || 0,
        avgResponseMs:
          diffs.length > 0 ? diffs.reduce((sum, v) => sum + v, 0) / diffs.length : null,
      };
    }

    return {
      overallAvgFirstResponseMs: avgMs,
      respondedConversationsCount: firstResponseDiffs.length,
      botReplyCount: botCount,
      agentStatsMap: statsMap,
    };
  }, [agents, conversations, messagesMap]);

  const myStats = agentStatsMap[currentAgent.id] || { handledCount: 0, avgResponseMs: null };
  const myClosedCount = myAssignedChats.filter((c) => c.status === 'closed').length;

  // ==========================================
  // 1. SUPPORT AGENT WORKSPACE VIEW
  // ==========================================
  if (!isAdmin) {
    return (
      <div className="flex-1 bg-slate-50 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Agent Workstation</h1>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                <User className="w-3.5 h-3.5" />
                <span>Personal Agent Metrics</span>
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Welcome back, <strong>{currentAgent.name}</strong>. Here is your personal queue and daily response stats.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Device Connected & Online</span>
          </div>
        </div>

        {/* Personal KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned to Me</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{myAssignedChats.length} Active</div>
              <div className="text-[11px] text-slate-500 mt-0.5">In your personal queue</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Avg Response</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{formatDuration(myStats.avgResponseMs)}</div>
              <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Calculated from live replies</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chats Handled</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{myStats.handledCount} Handled</div>
              <div className="text-[11px] text-sky-600 font-medium mt-0.5">{myClosedCount} closed · {myAssignedChats.length} assigned</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">My Urgent Tickets</div>
              <div className="text-2xl font-bold text-slate-900 mt-0.5">{myUrgentChats.length} Escalated</div>
              <div className="text-[11px] text-rose-600 font-medium mt-0.5">Needs prompt reply</div>
            </div>
          </div>
        </div>

        {/* My Assigned Queue List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Conversations Assigned to You</h2>
              <p className="text-xs text-slate-500 mt-0.5">Click any ticket to jump straight into the chat</p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">
              {myAssignedChats.length} Conversations
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {myAssignedChats.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                <p className="text-sm font-semibold text-slate-700">All caught up!</p>
                <p className="text-xs text-slate-400 mt-1">You have no pending conversations waiting in your queue.</p>
              </div>
            ) : (
              myAssignedChats.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => onOpenConversation && onOpenConversation(conv.id)}
                  className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-3.5">
                    <img
                      src={conv.contact?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                      alt="Contact"
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900">{conv.contact?.name || conv.contact?.phone_number}</span>
                        {conv.priority === 'urgent' && (
                          <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-full">
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate max-w-md mt-0.5">{conv.last_message_text}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-slate-400">
                      {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button className="px-3 py-1 bg-[#128C7E] hover:bg-[#075E54] text-white text-xs font-semibold rounded-lg flex items-center space-x-1 shadow-sm">
                      <span>Reply</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. ADMINISTRATOR COMPANY-WIDE DASHBOARD
  // ==========================================
  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Company Operations Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              <Shield className="w-3.5 h-3.5" />
              <span>Admin View: {agents.length} {agents.length === 1 ? 'Agent' : 'Agents'}</span>
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time multi-device metrics across {agents.length} active customer service {agents.length === 1 ? 'account' : 'accounts'} and Meta WhatsApp API
          </p>
        </div>

        {/* Live Device Status */}
        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold">
          <Smartphone className="w-4 h-4 text-emerald-600" />
          <span>{onlineAgents} of {agents.length} Online & Synced</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Conversations</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{openChats} Open</div>
            <div className="text-[11px] text-amber-600 font-medium mt-0.5">{unassignedChats} waiting in queue</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team Capacity</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{onlineAgents} / {agents.length} Online</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">{agents.length} {agents.length === 1 ? 'agent account' : 'agent accounts'} configured</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg First Response</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{formatDuration(overallAvgFirstResponseMs)}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>{respondedConversationsCount} of {conversations.length} chats replied</span>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Urgent Attention</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{urgentChats} Escalated</div>
            <div className="text-[11px] text-rose-600 font-medium mt-0.5">Priority customer tickets</div>
          </div>
        </div>
      </div>

      {/* Team Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Team Performance & Workload ({agents.length})</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time status, ticket assignments, and response times per agent</p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">
            Updated in Real-Time
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                <th className="py-3 px-4">Agent Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Device Status</th>
                <th className="py-3 px-4">Currently Assigned</th>
                <th className="py-3 px-4">Total Handled</th>
                <th className="py-3 px-4">Avg Response Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {agents.map((agent) => {
                const assignedCount = conversations.filter((c) => c.assigned_agent_id === agent.id).length;
                const stats = agentStatsMap[agent.id] || { handledCount: 0, avgResponseMs: null };
                return (
                  <tr key={agent.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center space-x-3">
                      <img
                        src={agent.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'}
                        alt={agent.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <div>{agent.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{agent.email}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          agent.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {agent.role === 'admin' ? (
                          <>
                            <Shield className="w-3 h-3" />
                            <span>Administrator</span>
                          </>
                        ) : (
                          'Support Specialist'
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="flex items-center space-x-1.5 font-medium">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            agent.is_online ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <span>{agent.is_online ? 'Active on Device' : 'Offline'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {assignedCount} {assignedCount === 1 ? 'chat' : 'chats'}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {stats.handledCount} {stats.handledCount === 1 ? 'chat' : 'chats'}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-700 font-semibold">
                      {formatDuration(stats.avgResponseMs)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration & Security Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">WhatsApp Cloud API</div>
            <div className="text-[11px] text-slate-500">{conversations.length} conversations synced live</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Supabase Multi-Device Sync</div>
            <div className="text-[11px] text-slate-500">{onlineAgents} active {onlineAgents === 1 ? 'session' : 'sessions'} online</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">Google Gemini Flash AI</div>
            <div className="text-[11px] text-slate-500">{botReplyCount} AI auto-{botReplyCount === 1 ? 'reply' : 'replies'} sent</div>
          </div>
        </div>
      </div>
    </div>
  );
};
