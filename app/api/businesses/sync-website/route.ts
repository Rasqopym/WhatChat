import { NextRequest, NextResponse } from 'next/server';
import { callGemini } from '@/lib/ai';

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
};

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

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal, headers: BROWSER_HEADERS });
  } finally {
    clearTimeout(timer);
  }
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

    let pageText = '';
    let pageTitle = '';
    let lastHttpStatus = 0;

    // 1. Try primary URL, then fallback subpaths if homepage returns 5xx/4xx
    const candidatePages = [normalized, `${origin}/shop`, `${origin}/products`];
    for (const url of candidatePages) {
      try {
        const res = await fetchWithTimeout(url);
        if (res.ok) {
          const html = await res.text();
          const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
          pageTitle = titleMatch ? stripHtml(titleMatch[1]) : parsedUrl.hostname;
          pageText = stripHtml(html).slice(0, 6000);
          if (pageText.length > 80) break;
        } else {
          lastHttpStatus = res.status;
        }
      } catch {
        // Try next candidate
      }
    }

    // 2. Try WooCommerce Store API, WP REST API, and Shopify products.json
    const productLines: string[] = [];
    try {
      const wcRes = await fetchWithTimeout(`${origin}/wp-json/wc/store/v1/products?per_page=25`);
      if (wcRes.ok) {
        const wcProducts = await wcRes.json();
        if (Array.isArray(wcProducts)) {
          for (const p of wcProducts.slice(0, 25)) {
            const price = p?.prices?.price
              ? `${p.prices.currency_symbol || ''}${Number(p.prices.price) / Math.pow(10, p.prices.currency_minor_unit ?? 2)}`
              : '';
            const desc = p?.short_description ? stripHtml(p.short_description).slice(0, 140) : '';
            productLines.push(`- ${p.name}${price ? ` (${price})` : ''}${desc ? `: ${desc}` : ''}`);
          }
        }
      }
    } catch {}

    if (productLines.length === 0) {
      try {
        const wpRes = await fetchWithTimeout(`${origin}/wp-json/wp/v2/product?per_page=25`);
        if (wpRes.ok) {
          const wpProducts = await wpRes.json();
          if (Array.isArray(wpProducts)) {
            for (const p of wpProducts.slice(0, 25)) {
              const title = p?.title?.rendered ? stripHtml(p.title.rendered) : '';
              const desc = p?.excerpt?.rendered ? stripHtml(p.excerpt.rendered).slice(0, 140) : '';
              if (title) productLines.push(`- ${title}${desc ? `: ${desc}` : ''}`);
            }
          }
        }
      } catch {}
    }

    if (productLines.length === 0) {
      try {
        const shRes = await fetchWithTimeout(`${origin}/products.json?limit=25`);
        if (shRes.ok) {
          const shData = await shRes.json();
          for (const p of (shData?.products || []).slice(0, 25)) {
            const price = p?.variants?.[0]?.price || '';
            const desc = p?.body_html ? stripHtml(p.body_html).slice(0, 140) : '';
            productLines.push(`- ${p.title}${price ? ` (${price})` : ''}${desc ? `: ${desc}` : ''}`);
          }
        }
      } catch {}
    }

    if (!pageText && productLines.length === 0) {
      return NextResponse.json(
        {
          error: lastHttpStatus
            ? `Your website (${origin}) returned HTTP ${lastHttpStatus}. Make sure the site is online or paste your product info directly into AI Context.`
            : `Could not reach ${origin}. Check the URL or paste your product info directly into AI Context.`,
        },
        { status: 400 }
      );
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
