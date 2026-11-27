import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/ai';

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const { websiteUrl } = await req.json();
    if (!websiteUrl || !String(websiteUrl).trim()) {
      return NextResponse.json({ error: 'Website URL is required' }, { status: 400 });
    }

    let normalized = String(websiteUrl).trim();
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }

    const parsedUrl = new URL(normalized);
    const origin = parsedUrl.origin;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);

    let pageText = '';
    let pageTitle = '';
    try {
      const res = await fetch(normalized, {
        signal: controller.signal,
        headers: { 'User-Agent': 'WhatChat-KnowledgeSync/1.0' },
      });
      if (!res.ok) {
        clearTimeout(timer);
        return NextResponse.json({ error: `Website returned HTTP ${res.status}` }, { status: 400 });
      }
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      pageTitle = titleMatch ? stripHtml(titleMatch[1]) : parsedUrl.hostname;
      pageText = stripHtml(html).slice(0, 6000);
    } finally {
      clearTimeout(timer);
    }

    // Try WooCommerce & Shopify public product endpoints if available
    const productLines: string[] = [];
    try {
      const wcRes = await fetch(`${origin}/wp-json/wc/store/v1/products?per_page=20`, {
        headers: { 'User-Agent': 'WhatChat-KnowledgeSync/1.0' },
      });
      if (wcRes.ok) {
        const wcProducts = await wcRes.json();
        if (Array.isArray(wcProducts)) {
          for (const p of wcProducts.slice(0, 20)) {
            const price = p?.prices?.price
              ? `${p.prices.currency_symbol || ''}${Number(p.prices.price) / Math.pow(10, p.prices.currency_minor_unit ?? 2)}`
              : '';
            const desc = p?.short_description ? stripHtml(p.short_description).slice(0, 120) : '';
            productLines.push(`- ${p.name}${price ? ` (${price})` : ''}${desc ? `: ${desc}` : ''}`);
          }
        }
      }
    } catch {
      // Not WooCommerce
    }

    if (productLines.length === 0) {
      try {
        const shRes = await fetch(`${origin}/products.json?limit=20`, {
          headers: { 'User-Agent': 'WhatChat-KnowledgeSync/1.0' },
        });
        if (shRes.ok) {
          const shData = await shRes.json();
          for (const p of (shData?.products || []).slice(0, 20)) {
            const price = p?.variants?.[0]?.price || '';
            const desc = p?.body_html ? stripHtml(p.body_html).slice(0, 120) : '';
            productLines.push(`- ${p.title}${price ? ` (${price})` : ''}${desc ? `: ${desc}` : ''}`);
          }
        }
      } catch {
        // Not Shopify
      }
    }

    const rawCombined = [
      `Website: ${origin}`,
      pageTitle ? `Title: ${pageTitle}` : '',
      productLines.length > 0 ? `Products:\n${productLines.join('\n')}` : '',
      pageText ? `Website Content:\n${pageText}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const aiSummary = await callGemini(
      `Organize the following business website and product catalog data into a concise, accurate customer-support knowledge base (products, prices, key features, delivery/support info) that a WhatsApp AI assistant can use to answer customer questions:\n\n${rawCombined.slice(0, 7500)}`
    );

    const knowledge = aiSummary || rawCombined.slice(0, 2500);

    return NextResponse.json({
      success: true,
      knowledge,
      productsFound: productLines.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch website knowledge' },
      { status: 500 }
    );
  }
}
