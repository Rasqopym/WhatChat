'use client';

import React, { useState, useEffect } from 'react';
import { Agent, Business, Conversation } from '@/types';
import {
  Megaphone,
  Building2,
  Tag,
  Users,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  LayoutTemplate,
} from 'lucide-react';

interface BroadcastCampaignsProps {
  agents: Agent[];
  businesses: Business[];
  conversations: Conversation[];
  currentAgent: Agent;
}

interface TemplateItem {
  name: string;
  language: string;
  category: string;
  bodyText: string;
}

export const BroadcastCampaigns: React.FC<BroadcastCampaignsProps> = ({
  businesses,
  conversations,
  currentAgent,
}) => {
  const isAdmin = currentAgent.role === 'admin';

  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(businesses[0]?.id || 'all');
  const [targetTag, setTargetTag] = useState<string>('ALL');
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('hello_world');
  const [paramValues, setParamValues] = useState<string[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [report, setReport] = useState<{
    total: number;
    sentCount: number;
    failedCount: number;
    results: Array<{ phone: string; name: string; status: 'sent' | 'failed'; error?: string }>;
  } | null>(null);

  useEffect(() => {
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data) => {
        if (data.templates && data.templates.length > 0) {
          setTemplates(data.templates);
          setSelectedTemplate(data.templates[0].name);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingTemplates(false));
  }, []);

  if (!isAdmin) {
    return (
      <div className="flex-1 bg-slate-50 overflow-y-auto p-6 md:p-12 flex items-center justify-center pb-24 md:pb-8">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Admin Privileges Required</h2>
          <p className="text-sm text-slate-500">
            Broadcast CRM campaigns can message many customers at once, so only <strong>Administrators</strong> can launch broadcasts.
          </p>
        </div>
      </div>
    );
  }

  // Extract all unique tags across conversations
  const allTagsSet = new Set<string>();
  conversations.forEach((c) => {
    (c.contact?.tags || []).forEach((t) => allTagsSet.add(t));
  });
  const availableTags = Array.from(allTagsSet);

  // Compute matched recipients preview
  const matchedMap = new Map<string, { phone: string; name: string; tags: string[] }>();
  conversations.forEach((c) => {
    if (selectedBusinessId !== 'all' && c.business_id && c.business_id !== selectedBusinessId) {
      return;
    }
    const tags = c.contact?.tags || [];
    if (targetTag !== 'ALL' && !tags.includes(targetTag)) {
      return;
    }
    const phone = c.contact?.phone_number;
    if (phone && !matchedMap.has(phone)) {
      matchedMap.set(phone, {
        phone,
        name: c.contact?.name || phone,
        tags,
      });
    }
  });
  const matchedRecipients = Array.from(matchedMap.values());

  const currentTpl = templates.find((t) => t.name === selectedTemplate) || templates[0];
  const placeholderMatches = currentTpl?.bodyText.match(/\{\{\d+\}\}/g) || [];
  const uniquePlaceholders = Array.from(new Set(placeholderMatches));

  const getPreviewText = () => {
    if (!currentTpl) return `📢 Broadcast: ${selectedTemplate}`;
    let text = currentTpl.bodyText;
    uniquePlaceholders.forEach((ph, idx) => {
      text = text.replaceAll(ph, paramValues[idx]?.trim() || ph);
    });
    return text;
  };

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending || matchedRecipients.length === 0) return;

    const confirmed = window.confirm(
      `Send "${selectedTemplate}" WhatsApp template to ${matchedRecipients.length} customer(s)?`
    );
    if (!confirmed) return;

    setIsSending(true);
    setReport(null);

    try {
      const res = await fetch('/api/broadcasts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusinessId,
          targetTag,
          templateName: selectedTemplate,
          languageCode: currentTpl?.language || 'en_US',
          bodyParams: uniquePlaceholders.map((_, idx) => paramValues[idx] || ''),
          previewText: getPreviewText(),
          agentId: currentAgent.id,
          fallbackRecipients: matchedRecipients,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Broadcast failed: ${data.error || 'Unknown error'}`);
      } else {
        setReport({
          total: data.total,
          sentCount: data.sentCount,
          failedCount: data.failedCount,
          results: data.results || [],
        });
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Megaphone className="w-6 h-6 text-[#128C7E]" />
            <span>Label-Based Broadcast Campaigns</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Send approved WhatsApp Template announcements to segmented customer labels
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 self-start">
          🛡️ Admin Only
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Campaign Builder */}
        <form onSubmit={handleLaunchCampaign} className="lg:col-span-2 space-y-6">
          {/* 1. Target Audience */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#128C7E]" />
              <span>1. Select Target Audience</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Business Line</span>
                </label>
                <select
                  value={selectedBusinessId}
                  onChange={(e) => setSelectedBusinessId(e.target.value)}
                  className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                >
                  <option value="all">🏢 All Businesses</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.display_phone_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Customer Label / Tag</span>
                </label>
                <select
                  value={targetTag}
                  onChange={(e) => setTargetTag(e.target.value)}
                  className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                >
                  <option value="ALL">All Contacts</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>
                      🏷️ {tag}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Template Selection */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-indigo-600" />
              <span>2. Choose Approved WhatsApp Template</span>
            </h2>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Template {isLoadingTemplates && '(Loading from Meta...)'}
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  setParamValues([]);
                }}
                className="w-full text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
              >
                {templates.map((t) => (
                  <option key={`${t.name}-${t.language}`} value={t.name}>
                    {t.name} ({t.language}) — {t.category}
                  </option>
                ))}
              </select>
            </div>

            {uniquePlaceholders.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">Template Variables</label>
                {uniquePlaceholders.map((ph, idx) => (
                  <input
                    key={ph}
                    type="text"
                    required
                    value={paramValues[idx] || ''}
                    onChange={(e) => {
                      const next = [...paramValues];
                      next[idx] = e.target.value;
                      setParamValues(next);
                    }}
                    placeholder={`Enter value for ${ph}`}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                  />
                ))}
              </div>
            )}

            <div className="bg-[#DCF8C6]/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-slate-800 space-y-1">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                WhatsApp Message Preview
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{getPreviewText()}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSending || matchedRecipients.length === 0}
                className="px-6 py-3 bg-[#128C7E] hover:bg-[#075E54] text-white font-bold text-sm rounded-xl flex items-center space-x-2 shadow-lg shadow-[#128C7E]/25 disabled:opacity-40 cursor-pointer transition-all"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending to {matchedRecipients.length} contacts...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Broadcast ({matchedRecipients.length} Recipients)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Right Column: Matched Audience Preview & Delivery Report */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Matched Recipients</h3>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                {matchedRecipients.length}
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {matchedRecipients.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No contacts match this business & label filter.
                </p>
              ) : (
                matchedRecipients.map((r) => (
                  <div key={r.phone} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{r.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{r.phone}</div>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[110px]">
                      {r.tags.slice(0, 2).map((t) => (
                        <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Delivery Report */}
          {report && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Campaign Delivery Report</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800">
                  <div className="font-bold text-lg">{report.sentCount}</div>
                  <div>Sent</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800">
                  <div className="font-bold text-lg">{report.failedCount}</div>
                  <div>Failed</div>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                {report.results.map((item) => (
                  <div key={item.phone} className="py-2 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-800">{item.name}</div>
                      {item.error && <div className="text-[10px] text-rose-600">{item.error}</div>}
                    </div>
                    {item.status === 'sent' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
