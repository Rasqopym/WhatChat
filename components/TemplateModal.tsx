'use client';

import React, { useState, useEffect } from 'react';
import { Business, Agent } from '@/types';
import { X, Send, Loader2, LayoutTemplate, MessageSquarePlus } from 'lucide-react';

interface TemplateItem {
  name: string;
  language: string;
  category: string;
  bodyText: string;
}

interface TemplateModalProps {
  mode: 'new_chat' | 'reply_template';
  conversationId?: string;
  customerLabel?: string;
  businesses: Business[];
  defaultBusinessId?: string;
  currentAgent: Agent;
  onClose: () => void;
  onSent: (conversationId: string) => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  mode,
  conversationId,
  customerLabel,
  businesses,
  defaultBusinessId,
  currentAgent,
  onClose,
  onSent,
}) => {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('hello_world');
  const [paramValues, setParamValues] = useState<string[]>([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [businessId, setBusinessId] = useState(
    defaultBusinessId && defaultBusinessId !== 'all' ? defaultBusinessId : businesses[0]?.id || ''
  );
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const qs = businessId ? `?businessId=${encodeURIComponent(businessId)}` : '';
    fetch(`/api/templates${qs}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.templates && data.templates.length > 0) {
          setTemplates(data.templates);
          setSelectedTemplate((prev) =>
            data.templates.some((t: TemplateItem) => t.name === prev) ? prev : data.templates[0].name
          );
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [businessId]);

  const currentTpl = templates.find((t) => t.name === selectedTemplate) || templates[0];

  // Detect {{1}}, {{2}} placeholders in template body
  const placeholderMatches = currentTpl?.bodyText.match(/\{\{\d+\}\}/g) || [];
  const uniquePlaceholders = Array.from(new Set(placeholderMatches));

  // Build live preview text
  const getPreviewText = () => {
    if (!currentTpl) return `Template: ${selectedTemplate}`;
    let text = currentTpl.bodyText;
    uniquePlaceholders.forEach((ph, idx) => {
      text = text.replaceAll(ph, paramValues[idx]?.trim() || ph);
    });
    return text;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;
    if (mode === 'new_chat' && !phoneNumber.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/messages/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: mode === 'reply_template' ? conversationId : undefined,
          phoneNumber: mode === 'new_chat' ? phoneNumber.trim() : undefined,
          customerName: mode === 'new_chat' ? customerName.trim() : undefined,
          businessId: mode === 'new_chat' ? businessId : undefined,
          templateName: selectedTemplate,
          languageCode: currentTpl?.language || 'en_US',
          bodyParams: uniquePlaceholders.map((_, idx) => paramValues[idx] || ''),
          previewText: getPreviewText(),
          agentId: currentAgent.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Failed to send template: ${data.error || 'Unknown error'}`);
        return;
      }

      onSent(data.conversationId);
      onClose();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {mode === 'new_chat' ? (
              <>
                <MessageSquarePlus className="w-5 h-5 text-[#128C7E]" />
                <span>Start New WhatsApp Chat</span>
              </>
            ) : (
              <>
                <LayoutTemplate className="w-5 h-5 text-[#128C7E]" />
                <span>Send Approved Template</span>
              </>
            )}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'new_chat' ? (
            <>
              {businesses.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Send From Business Line</label>
                  <select
                    value={businessId}
                    onChange={(e) => setBusinessId(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.display_phone_number})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="2348161354532"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Optional"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              Sending template to: <strong className="text-slate-800">{customerLabel}</strong>
            </div>
          )}

          {/* Template Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Approved WhatsApp Template {isLoading && '(Loading...)'}
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value);
                setParamValues([]);
              }}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
            >
              {templates.map((t) => (
                <option key={`${t.name}-${t.language}`} value={t.name}>
                  {t.name} ({t.language}) — {t.category}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Variables if template has {{1}}, {{2}} */}
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
                  placeholder={`Value for ${ph}`}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#128C7E] focus:outline-none"
                />
              ))}
            </div>
          )}

          {/* Live Preview */}
          <div className="bg-[#DCF8C6]/70 border border-emerald-200 rounded-xl p-3 text-xs text-slate-800 space-y-1">
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">WhatsApp Preview</div>
            <p className="whitespace-pre-wrap leading-relaxed">{getPreviewText()}</p>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-4 py-2 bg-[#128C7E] hover:bg-[#075E54] text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{mode === 'new_chat' ? 'Start & Send' : 'Send Template'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
