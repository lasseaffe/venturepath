import Anthropic from '@anthropic-ai/sdk';

let anthropicClient = null;
function getClient() {
  if (!anthropicClient) {
    const apiKey = import.meta.env?.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    anthropicClient = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }
  return anthropicClient;
}

export function buildInsights(eventType, payload, context = {}) {
  const insights = [];

  if (eventType === 'SQUAD_WEIGHT_CHANGED' && payload.overLimit) {
    insights.push({
      id: `weight_overload_${payload.memberId}`,
      message: `${payload.memberId} is carrying ${payload.newKg}kg — over the max. Reassign items to balance the squad.`,
      cta: { label: 'Reassign gear', targetTab: 'LOGISTICS' },
      targetTab: 'LOGISTICS',
    });
  }

  if (eventType === 'HAZARD_UPDATED') {
    for (const hazard of payload.hazards ?? []) {
      insights.push({
        id: `hazard_${hazard.id}`,
        message: `${hazard.label} — affected gear moved to CRITICAL.`,
        cta: null,
        targetTab: 'LOGISTICS',
      });
      if (hazard.affectedStopTypes?.length > 0) {
        insights.push({
          id: `hazard_itinerary_${hazard.id}`,
          message: `${hazard.label} — ${hazard.affectedStopTypes.join(', ')} stops flagged as HIGH RISK. Consider a delay or Plan B route.`,
          cta: null,
          targetTab: 'ITINERARY',
        });
      }
    }
  }

  if (eventType === 'BUDGET_THRESHOLD') {
    const pct = Math.round((payload.spent / payload.limit) * 100);
    insights.push({
      id: `budget_${payload.category}`,
      message: `Budget at ${pct}% in ${payload.category}. Consider adjusting or checking insurance coverage.`,
      cta: { label: 'View budget', targetTab: 'LOGISTICS' },
      targetTab: 'LOGISTICS',
    });
  }

  if (eventType === 'STOP_ADDED') {
    const { stop, legIndex } = payload;
    if (stop.type === 'summit' || stop.type === 'coastal') {
      const manifest = context.manifest ?? [];
      if (!manifest.includes('water_filter')) {
        insights.push({
          id: `hike_water_${legIndex}`,
          message: `${stop.name || 'New stop'} added — water bottles/filter not in manifest for this leg.`,
          cta: { label: 'Open packing list', targetTab: 'LOGISTICS' },
          targetTab: 'LOGISTICS',
        });
      }
      if (!manifest.includes('powerbank')) {
        insights.push({
          id: `hike_power_${legIndex}`,
          message: `Long hike planned — power bank not packed. Remote areas may have no charging points.`,
          cta: { label: 'Open packing list', targetTab: 'LOGISTICS' },
          targetTab: 'LOGISTICS',
        });
      }
    }
  }

  if (eventType === 'PACK_ITEM_MISSING') {
    insights.push({
      id: `missing_${payload.itemLabel.replace(/\s+/g, '_')}`,
      message: `Reminder: ${payload.itemLabel} is not packed for the next leg.`,
      cta: { label: 'Open packing list', targetTab: 'LOGISTICS' },
      targetTab: 'LOGISTICS',
    });
  }

  return insights;
}

export async function generateDepartureBrief(leg, context) {
  const cacheKey = `architect_brief_${leg.id}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) return cached;

  const client = getClient();
  if (!client) return null;

  const prompt = `You are the Architect, a tactical expedition AI advisor.
Write a 2-3 sentence pre-departure brief for the squad. Be concise and specific.

Leg: ${leg.from} → ${leg.to} (${leg.mode}, ~${leg.durationH}h)
Active hazards: ${context.hazards.map(h => h.label).join(', ') || 'none'}
Missing gear: ${context.manifest.length > 0 ? context.manifest.join(', ') : 'none'}
Squad roles: ${context.squad.map(m => m.name).join(', ')}

Tone: tactical, direct. No fluff. Focus on what could go wrong and what they must do before departing.`;

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{ role: 'user', content: prompt }],
    });
    const brief = msg.content[0].text;
    sessionStorage.setItem(cacheKey, brief);
    return brief;
  } catch {
    return null;
  }
}
