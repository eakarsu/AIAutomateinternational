// Custom Views routes - International trade / cross-border automation
// Features: trade-flow world map, tariff comparison chart, customs declaration PDF, shipment tracking
const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');

router.use(auth);

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const getModel = () => process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

async function callAI(systemPrompt, userPrompt, temperature = 0.4) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set');
  }
  const r = await axios.post(
    OPENROUTER_URL,
    {
      model: getModel(),
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );
  return r.data.choices[0].message.content;
}

function parseJsonMaybe(text, fallback) {
  try {
    const m = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    return JSON.parse((m ? m[1] : text).trim());
  } catch {
    return fallback;
  }
}

// ----------------------------------------------------------------
// 1. VIZ: Trade Flow World Map
// POST /api/custom-views/trade-flow-map { origin, period }
// Returns: { origin, period, flows: [{ destination, country_code, volume_usd, lat, lng, hs_chapter }], total_usd, summary }
// ----------------------------------------------------------------
router.post('/trade-flow-map', async (req, res) => {
  try {
    const { origin = 'United States', period = 'last 30 days' } = req.body;

    // Fallback static dataset (deterministic, realistic geo coords)
    const staticFlows = [
      { destination: 'Germany',        country_code: 'DE', lat: 51.16, lng: 10.45, volume_usd: 4_250_000, hs_chapter: '84 - Machinery' },
      { destination: 'China',          country_code: 'CN', lat: 35.86, lng: 104.19, volume_usd: 8_120_000, hs_chapter: '85 - Electrical' },
      { destination: 'Mexico',         country_code: 'MX', lat: 23.63, lng: -102.55, volume_usd: 6_540_000, hs_chapter: '87 - Vehicles' },
      { destination: 'Canada',         country_code: 'CA', lat: 56.13, lng: -106.35, volume_usd: 5_980_000, hs_chapter: '27 - Energy' },
      { destination: 'United Kingdom', country_code: 'GB', lat: 55.38, lng: -3.43, volume_usd: 3_410_000, hs_chapter: '90 - Optical/Medical' },
      { destination: 'Japan',          country_code: 'JP', lat: 36.20, lng: 138.25, volume_usd: 2_890_000, hs_chapter: '88 - Aircraft' },
      { destination: 'Brazil',         country_code: 'BR', lat: -14.23, lng: -51.92, volume_usd: 1_750_000, hs_chapter: '10 - Cereals' },
      { destination: 'India',          country_code: 'IN', lat: 20.59, lng: 78.96, volume_usd: 2_140_000, hs_chapter: '29 - Chemicals' },
      { destination: 'South Korea',    country_code: 'KR', lat: 35.90, lng: 127.76, volume_usd: 3_080_000, hs_chapter: '85 - Electrical' },
      { destination: 'Australia',      country_code: 'AU', lat: -25.27, lng: 133.77, volume_usd: 1_620_000, hs_chapter: '12 - Oilseeds' },
      { destination: 'Netherlands',    country_code: 'NL', lat: 52.13, lng: 5.29, volume_usd: 2_530_000, hs_chapter: '30 - Pharma' },
      { destination: 'Singapore',      country_code: 'SG', lat: 1.35, lng: 103.82, volume_usd: 1_980_000, hs_chapter: '85 - Electrical' },
    ];

    let summary = `Top trade corridors for ${origin} (${period}). Largest flows: China, Mexico, Canada.`;
    try {
      const ai = await callAI(
        'You are a senior international trade analyst. Respond ONLY with strict JSON.',
        `Origin country: ${origin}\nPeriod: ${period}\nProvide a 1-2 sentence executive summary of likely top-5 export corridors and key risks. JSON: {"summary":"..."}`
      );
      const parsed = parseJsonMaybe(ai, { summary });
      summary = parsed.summary || summary;
    } catch (e) {
      // keep static summary
    }

    const total_usd = staticFlows.reduce((s, f) => s + f.volume_usd, 0);
    res.json({
      origin,
      period,
      generated_at: new Date().toISOString(),
      total_usd,
      flows: staticFlows,
      summary,
    });
  } catch (err) {
    console.error('trade-flow-map error:', err.message);
    res.status(500).json({ error: 'Failed to build trade flow map' });
  }
});

// ----------------------------------------------------------------
// 2. VIZ: Tariff Comparison Chart
// POST /api/custom-views/tariff-compare { hs_code, origin, destinations[] }
// Returns: { hs_code, origin, comparisons: [{ destination, tariff_pct, mfn_pct, fta, effective_pct }], cheapest, narrative }
// ----------------------------------------------------------------
router.post('/tariff-compare', async (req, res) => {
  try {
    const {
      hs_code = '8471.30',
      origin = 'United States',
      destinations = ['Germany', 'Mexico', 'China', 'Japan', 'Brazil', 'India', 'United Kingdom', 'Canada'],
    } = req.body;

    // Deterministic pseudo-tariffs from HS code + destination
    const seed = (s) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return h;
    };
    const ftaPairs = new Set([
      'United States|Mexico', 'United States|Canada',
      'United States|South Korea', 'United States|Australia',
    ]);
    const comparisons = destinations.map((dest) => {
      const h = seed(`${hs_code}-${origin}-${dest}`);
      const mfn_pct = parseFloat(((h % 250) / 10).toFixed(2)); // 0 - 25%
      const fta = ftaPairs.has(`${origin}|${dest}`);
      const tariff_pct = fta ? 0 : mfn_pct;
      const vat_pct = parseFloat((((h >> 4) % 220) / 10).toFixed(2)); // 0 - 22%
      const effective_pct = parseFloat((tariff_pct + vat_pct).toFixed(2));
      return {
        destination: dest,
        country_code: dest.slice(0, 2).toUpperCase(),
        mfn_pct,
        fta,
        tariff_pct,
        vat_pct,
        effective_pct,
      };
    });

    const cheapest = comparisons.reduce((min, c) => (c.effective_pct < min.effective_pct ? c : min), comparisons[0]);

    let narrative = `For HS ${hs_code} shipped from ${origin}, ${cheapest.destination} offers the lowest landed-cost burden at ${cheapest.effective_pct}%.`;
    try {
      const ai = await callAI(
        'You are an international trade & customs strategist. Respond ONLY with strict JSON.',
        `HS code: ${hs_code}\nOrigin: ${origin}\nLowest effective tariff destination: ${cheapest.destination} (${cheapest.effective_pct}%).\nWrite 2 sentences explaining the strategic implication. JSON: {"narrative":"..."}`
      );
      const parsed = parseJsonMaybe(ai, { narrative });
      narrative = parsed.narrative || narrative;
    } catch (e) {
      // keep static
    }

    res.json({
      hs_code,
      origin,
      generated_at: new Date().toISOString(),
      comparisons,
      cheapest,
      narrative,
    });
  } catch (err) {
    console.error('tariff-compare error:', err.message);
    res.status(500).json({ error: 'Failed to compute tariff comparison' });
  }
});

// ----------------------------------------------------------------
// 3. NON-VIZ: Customs Declaration PDF (synthesized text)
// POST /api/custom-views/customs-declaration { shipper, consignee, items[], origin, destination, incoterm }
// Returns: { declaration_id, document_text, fields, generated_at }
// ----------------------------------------------------------------
router.post('/customs-declaration', async (req, res) => {
  try {
    const {
      shipper = 'AIAutomate International Inc., 100 Trade Plaza, New York, NY 10001, USA',
      consignee = 'Müller GmbH, Friedrichstr. 90, 10117 Berlin, Germany',
      origin = 'United States',
      destination = 'Germany',
      incoterm = 'DAP',
      currency = 'USD',
      items = [
        { description: 'Portable laptop computers', hs_code: '8471.30', qty: 50, unit_value: 1200, country_of_origin: 'US' },
        { description: 'Wireless mice', hs_code: '8471.60', qty: 200, unit_value: 18, country_of_origin: 'US' },
      ],
    } = req.body;

    const total_value = items.reduce((s, it) => s + (it.qty || 0) * (it.unit_value || 0), 0);
    const declaration_id = `CD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;

    const itemLines = items
      .map(
        (it, i) =>
          `  ${i + 1}. ${it.description} | HS ${it.hs_code} | Qty ${it.qty} | Unit ${currency} ${it.unit_value} | Origin ${it.country_of_origin}`
      )
      .join('\n');

    const staticBody = `═══════════════════════════════════════════════════════════════
        SINGLE ADMINISTRATIVE DOCUMENT (SAD / CN23)
                Declaration #: ${declaration_id}
═══════════════════════════════════════════════════════════════

SHIPPER (EXPORTER)
${shipper}

CONSIGNEE (IMPORTER)
${consignee}

ROUTE              : ${origin}  ──►  ${destination}
INCOTERMS 2020     : ${incoterm}
CURRENCY OF INVOICE: ${currency}
DECLARED TOTAL     : ${currency} ${total_value.toLocaleString()}

ITEMIZED CARGO
${itemLines}

DECLARATION
I hereby declare that the information given in this document is
true and accurate, that the goods are of the origin stated, and
that all applicable export-control requirements have been met.

Signed (electronic): ${shipper.split(',')[0]}
Date: ${new Date().toISOString().slice(0, 10)}
═══════════════════════════════════════════════════════════════`;

    let document_text = staticBody;
    try {
      const ai = await callAI(
        'You are a licensed customs broker. Append a concise compliance notes section (3-5 bullet points) covering HS codes, controlled items, and Incoterm responsibilities. Plain text only, no markdown.',
        `Cargo: ${JSON.stringify(items)}\nRoute: ${origin} -> ${destination}\nIncoterm: ${incoterm}\nReturn only the bullet list with leading "- ".`
      );
      document_text = `${staticBody}\n\nCOMPLIANCE NOTES (AI-ASSISTED)\n${ai.trim()}`;
    } catch (e) {
      // skip AI block
    }

    res.json({
      declaration_id,
      generated_at: new Date().toISOString(),
      fields: { shipper, consignee, origin, destination, incoterm, currency, total_value, items },
      document_text,
    });
  } catch (err) {
    console.error('customs-declaration error:', err.message);
    res.status(500).json({ error: 'Failed to generate customs declaration' });
  }
});

// ----------------------------------------------------------------
// 4. NON-VIZ: Shipment Tracking
// POST /api/custom-views/shipment-track { tracking_number, carrier }
// Returns: { tracking_number, carrier, status, eta, events[], current_location, ai_notes }
// ----------------------------------------------------------------
router.post('/shipment-track', async (req, res) => {
  try {
    const { tracking_number = `AIA${Math.floor(Math.random() * 1_000_000)}`, carrier = 'Maersk Line' } = req.body;

    const now = Date.now();
    const events = [
      { ts: new Date(now - 9 * 86_400_000).toISOString(), location: 'Shanghai, CN', code: 'BKD',  description: 'Booking confirmed at port of loading' },
      { ts: new Date(now - 8 * 86_400_000).toISOString(), location: 'Shanghai, CN', code: 'GIN',  description: 'Gate-in at terminal' },
      { ts: new Date(now - 7 * 86_400_000).toISOString(), location: 'Shanghai, CN', code: 'LOD',  description: 'Loaded on vessel MV NORDIC STAR' },
      { ts: new Date(now - 4 * 86_400_000).toISOString(), location: 'Singapore, SG', code: 'TRS', description: 'Transshipment / vessel arrival' },
      { ts: new Date(now - 3 * 86_400_000).toISOString(), location: 'Singapore, SG', code: 'TRD', description: 'Departed transshipment port' },
      { ts: new Date(now - 1 * 86_400_000).toISOString(), location: 'Indian Ocean',  code: 'INT', description: 'In transit - vessel underway' },
    ];
    const current_location = events[events.length - 1].location;
    const eta = new Date(now + 6 * 86_400_000).toISOString();
    const status = 'In Transit';

    let ai_notes = 'Shipment on schedule. No reported port congestion on the corridor.';
    try {
      const ai = await callAI(
        'You are a logistics operations analyst. Respond ONLY with strict JSON.',
        `Tracking: ${tracking_number}\nCarrier: ${carrier}\nCurrent: ${current_location}\nETA: ${eta}\nProvide 1-2 sentences on risks (weather, congestion, tariffs) and recommendation. JSON: {"ai_notes":"..."}`
      );
      const parsed = parseJsonMaybe(ai, { ai_notes });
      ai_notes = parsed.ai_notes || ai_notes;
    } catch (e) {
      // keep static
    }

    res.json({
      tracking_number,
      carrier,
      status,
      current_location,
      eta,
      generated_at: new Date().toISOString(),
      events,
      ai_notes,
    });
  } catch (err) {
    console.error('shipment-track error:', err.message);
    res.status(500).json({ error: 'Failed to fetch shipment tracking' });
  }
});

module.exports = router;
