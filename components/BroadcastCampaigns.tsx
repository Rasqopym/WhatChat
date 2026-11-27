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
  Shield,
  History,
  Upload,
  X,
} from 'lucide-react';

interface BroadcastCampaignsProps {
  agents: Agent[];
  businesses: Business[];
  conversations: Conversation[];
  currentAgent: Agent;
  onContactsImported?: () => Promise<void> | void;
}

interface TemplateItem {
  name: string;
  language: string;
  category: string;
  bodyText: string;
  headerFormat?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  headerText?: string;
  headerExampleUrl?: string;
  buttons?: Array<{ type: string; text: string; url?: string }>;
}

export const BroadcastCampaigns: React.FC<BroadcastCampaignsProps> = ({
  businesses,
  conversations,
  currentAgent,
  onContactsImported,
}) => {
  const isAdmin = currentAgent.role === 'admin';

  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(businesses[0]?.id || 'all');
  const [targetTag, setTargetTag] = useState<string>('ALL');
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('hello_world');
  const [paramValues, setParamValues] = useState<string[]>([]);
  const [headerMediaUrl, setHeaderMediaUrl] = useState<string>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templateWarning, setTemplateWarning] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [report, setReport] = useState<{
    total: number;
    sentCount: number;
    failedCount: number;
    results: Array<{ phone: string; name: string; status: 'sent' | 'failed'; error?: string }>;
  } | null>(null);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      business_name: string;
      template_name: string;
      target_tag: string;
      total_recipients: number;
      sent_count: number;
      failed_count: number;
      created_at: string;
    }>
  >([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importDefaultTag, setImportDefaultTag] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const loadHistory = () => {
    fetch('/api/broadcasts/history', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.campaigns)) {
          setHistory(data.campaigns);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    setIsLoadingTemplates(true);
    setTemplateWarning(null);
    const qs = selectedBusinessId ? `?businessId=${encodeURIComponent(selectedBusinessId)}` : '';
    fetch(`/api/templates${qs}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.templates && data.templates.length > 0) {
          setTemplates(data.templates);
          setSelectedTemplate((prev) =>
            data.templates.some((t: TemplateItem) => t.name === prev) ? prev : data.templates[0].name
          );
        }
        if (data.warning) {
          setTemplateWarning(data.warning);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingTemplates(false));
  }, [selectedBusinessId]);

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
  const needsHeaderMedia =
    currentTpl?.headerFormat === 'IMAGE' ||
    currentTpl?.headerFormat === 'VIDEO' ||
    currentTpl?.headerFormat === 'DOCUMENT';

  useEffect(() => {
    setHeaderMediaUrl(currentTpl?.headerExampleUrl || '');
  }, [currentTpl?.name, currentTpl?.headerExampleUrl]);

  const placeholderMatches = currentTpl?.bodyText.match(/\{\{[^}]+\}\}/g) || [];
  const uniquePlaceholders = Array.from(new Set(placeholderMatches));

  const getPreviewText = () => {
    if (!currentTpl) return `Broadcast: ${selectedTemplate}`;
    let text = currentTpl.bodyText;
    uniquePlaceholders.forEach((ph, idx) => {
      text = text.replaceAll(ph, paramValues[idx]?.trim() || ph);
    });
    if (currentTpl.buttons && currentTpl.buttons.length > 0) {
      text += '\n\n' + currentTpl.buttons.map((b) => `[${b.text}]`).join('  ');
    }
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
          headerMediaType: needsHeaderMedia ? currentTpl?.headerFormat : undefined,
          headerMediaUrl: needsHeaderMedia ? headerMediaUrl.trim() : undefined,
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
        loadHistory();
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const parseCsvContacts = (raw: string) => {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: Array<{ name: string; phone: string; tags: string[] }> = [];

    for (let i = 0; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (i === 0 && /phone|mobile|number|name/i.test(cols.join(' '))) continue;

      const phoneCol = cols.find((c) => /\d{7,}/.test(c.replace(/[^\d]/g, ''))) || '';
      const phoneDigits = phoneCol.replace(/[^\d]/g, '');
      if (phoneDigits.length < 7) continue;

      const otherCols = cols.filter((c) => c !== phoneCol);
      const name = otherCols[0] || '';
      const tags = otherCols.slice(1).flatMap((t) => t.split(';').map((s) => s.trim()).filter(Boolean));
      parsed.push({ name, phone: phoneDigits, tags });
    }
    return parsed;
  };

  const parsedImportContacts = parseCsvContacts(csvText);

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedImportContacts.length === 0 || isImporting) return;

    setIsImporting(true);
    setImportResult(null);
    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusinessId,
          contacts: parsedImportContacts,
          defaultTag: importDefaultTag.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Import failed: ${data.error || 'Unknown error'}`);
        return;
      }
      setImportResult(
        `Imported ${data.importedCount} new, updated ${data.updatedCount}, skipped ${data.skippedCount}.`
      );
      if (onContactsImported) await onContactsImported();
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setIsImporting(false);
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
        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => {
              setImportResult(null);
              setShowImportModal(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-[#128C7E]" />
            <span>Import CSV Contacts</span>
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Only</span>
          </span>
        </div>
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
                  <option value="all">All Businesses</option>
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
                      {tag}
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
              {templateWarning && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2">
                  {templateWarning}
                </p>
              )}
            </div>

            {needsHeaderMedia && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Header {currentTpl?.headerFormat} URL *
                </label>
                <input
                  type="url"
                  required
                  value={headerMediaUrl}
                  onChange={(e) => setHeaderMediaUrl(e.target.value)}
                  placeholder={`https://example.com/media.${currentTpl?.headerFormat === 'IMAGE' ? 'jpg' : currentTpl?.headerFormat === 'VIDEO' ? 'mp4' : 'pdf'}`}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                />
                <p className="text-[11px] text-slate-400">
                  Required by Meta for templates with a {currentTpl?.headerFormat?.toLowerCase()} header.
                </p>
              </div>
            )}

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

            <div className="bg-[#DCF8C6]/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-slate-800 space-y-2">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                WhatsApp Message Preview
              </div>
              {currentTpl?.headerFormat === 'IMAGE' && headerMediaUrl && (
                <img
                  src={headerMediaUrl}
                  alt="Template header"
                  className="w-full max-h-44 object-cover rounded-lg border border-emerald-200"
                />
              )}
              <p className="whitespace-pre-wrap leading-relaxed">
                {(() => {
                  if (!currentTpl) return `Broadcast: ${selectedTemplate}`;
                  let text = currentTpl.bodyText;
                  uniquePlaceholders.forEach((ph, idx) => {
                    text = text.replaceAll(ph, paramValues[idx]?.trim() || ph);
                  });
                  return text;
                })()}
              </p>
              {currentTpl?.buttons && currentTpl.buttons.length > 0 && (
                <div className="pt-1.5 border-t border-emerald-200/80 flex flex-wrap gap-1.5">
                  {currentTpl.buttons.map((btn, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/90 text-[#128C7E] font-semibold text-[11px] border border-emerald-200"
                    >
                      {btn.text}
                    </span>
                  ))}
                </div>
              )}
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

          {/* Campaign History Log */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#128C7E]" />
                <span>Recent Campaigns</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">{history.length}</span>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No past broadcast campaigns logged yet.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {history.map((item) => (
                  <div key={item.id} className="py-2.5 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 truncate">{item.template_name}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                        {item.sent_count}/{item.total_recipients} sent
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        {item.business_name} · {item.target_tag === 'ALL' ? 'All Contacts' : item.target_tag}
                      </span>
                      <span>
                        {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSV Contact Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#128C7E]" />
                <span>Import Contacts via CSV</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Upload .csv file (Name, Phone, Tag)
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => setCsvText(String(ev.target?.result || ''));
                    reader.readAsText(file);
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-[#128C7E] hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Or paste CSV rows
                </label>
                <textarea
                  rows={5}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`name,phone,tag\nJohn Doe,2348012345678,VIP\nJane Smith,2348098765432,Promo`}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Default Label / Tag (Optional)
                </label>
                <input
                  type="text"
                  value={importDefaultTag}
                  onChange={(e) => setImportDefaultTag(e.target.value)}
                  placeholder="e.g. Black Friday, VIP"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                />
              </div>

              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>Detected valid contacts: <strong className="text-slate-800">{parsedImportContacts.length}</strong></span>
                {importResult && (
                  <span className="text-emerald-700 font-semibold">{importResult}</span>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={parsedImportContacts.length === 0 || isImporting}
                  className="px-4 py-2 bg-[#128C7E] hover:bg-[#075E54] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-40 cursor-pointer"
                >
                  {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>Import {parsedImportContacts.length} Contacts</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
