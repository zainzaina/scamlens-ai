// ScamLens AI client — calls the server proxy which uses GROQ_API_KEY.
(function () {
  const ENDPOINT = '/api/public/scamlens-analyze';

  async function analyze({ text, url }) {
    if (!text && !url) throw new Error('EMPTY_INPUT');

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, url }),
    });

    if (!res.ok) {
      let msg = `Analysis failed (${res.status})`;
      try {
        const j = await res.json();
        if (j && j.error) msg = j.error;
      } catch {}
      throw new Error(msg);
    }

    const json = await res.json();
    json.risk_score = Math.max(0, Math.min(100, Number(json.risk_score) || 0));
    json.confidence = Math.max(0, Math.min(100, Number(json.confidence) || 50));
    json.awareness_score = Math.max(0, Math.min(100, Number(json.awareness_score) || 50));
    json.manipulation_techniques = json.manipulation_techniques || [];
    json.red_flags = json.red_flags || [];
    json.scam_dna = json.scam_dna || [];
    json.future_impact = json.future_impact || [];
    json.victim_timeline = json.victim_timeline || [];
    json.awareness_notes = json.awareness_notes || [];
    return json;
  }

  window.ScamLens = window.ScamLens || {};
  window.ScamLens.analyze = analyze;
})();
