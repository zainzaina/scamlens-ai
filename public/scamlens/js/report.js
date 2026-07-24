// PDF report generation with jsPDF
(function () {
  function generatePDF(r, input) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 48;
    let y = M;

    // Header
    doc.setFillColor(7, 11, 20);
    doc.rect(0, 0, W, 90, 'F');
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(M, 24, 40, 40, 8, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('ScamLens AI', M + 52, 48);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('AI-Assisted Scam Risk Report', M + 52, 66);
    doc.setTextColor(148, 163, 184);
    doc.text(new Date().toLocaleString(), W - M, 48, { align: 'right' });

    y = 120;
    doc.setTextColor(15, 23, 42);

    // Risk banner
    const c = window.ScamLens.riskColor(r.risk_score);
    const rgb = hexToRgb(c);
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.roundedRect(M, y, W - 2 * M, 70, 10, 10, 'F');
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold');
    doc.setFontSize(28);
    doc.text(`${r.risk_score}/100`, M + 20, y + 45);
    doc.setFontSize(14);
    doc.text(r.risk_level || '', M + 140, y + 32);
    doc.setFont('helvetica','normal');
    doc.setFontSize(11);
    doc.text(`Type: ${r.scam_type} · Confidence: ${r.confidence}% · Advice: ${r.recommendation}`, M + 140, y + 52);
    y += 90;

    doc.setTextColor(15,23,42);

    y = section(doc, 'Summary', y, M, W);
    y = paragraph(doc, r.summary || '', y, M, W);
    y = paragraph(doc, r.explanation || '', y, M, W);

    y = section(doc, 'Analyzed Input', y, M, W);
    y = paragraph(doc, (input?.summary || '').slice(0, 800), y, M, W);

    y = section(doc, 'Scam DNA — Detected Behaviors', y, M, W);
    y = bullets(doc, r.scam_dna || [], y, M, W);

    y = section(doc, 'Red Flags', y, M, W);
    y = bullets(doc, r.red_flags || [], y, M, W);

    y = section(doc, 'Psychological Manipulation', y, M, W);
    y = bullets(doc, r.manipulation_techniques || [], y, M, W);

    y = section(doc, 'Future Impact', y, M, W);
    y = bullets(doc, r.future_impact || [], y, M, W);

    y = section(doc, 'Victim Timeline', y, M, W);
    y = bullets(doc, (r.victim_timeline || []).map(t => `${t.when}: ${t.event}`), y, M, W);

    y = section(doc, 'Recommendation', y, M, W);
    y = paragraph(doc, `${r.recommendation}. ${r.educational_tip || ''}`, y, M, W);

    y = section(doc, `Security Awareness Score: ${r.awareness_score}/100`, y, M, W);
    y = bullets(doc, r.awareness_notes || [], y, M, W);

    // Footer on last page
    doc.setFontSize(9);
    doc.setTextColor(148,163,184);
    const footer = 'This report is AI-assisted and should not replace professional cybersecurity investigation.';
    doc.text(footer, W/2, H - 24, { align: 'center' });

    doc.save(`scamlens-report-${Date.now()}.pdf`);
  }

  function ensureSpace(doc, y, need = 60) {
    const H = doc.internal.pageSize.getHeight();
    if (y + need > H - 48) { doc.addPage(); return 60; }
    return y;
  }
  function section(doc, title, y, M, W) {
    y = ensureSpace(doc, y, 40);
    doc.setDrawColor(226,232,240);
    doc.line(M, y - 8, W - M, y - 8);
    doc.setFont('helvetica','bold');
    doc.setFontSize(13);
    doc.setTextColor(15,23,42);
    doc.text(title, M, y + 8);
    return y + 22;
  }
  function paragraph(doc, text, y, M, W) {
    if (!text) return y;
    doc.setFont('helvetica','normal');
    doc.setFontSize(11);
    doc.setTextColor(51,65,85);
    const lines = doc.splitTextToSize(text, W - 2 * M);
    for (const ln of lines) {
      y = ensureSpace(doc, y, 16);
      doc.text(ln, M, y);
      y += 14;
    }
    return y + 4;
  }
  function bullets(doc, items, y, M, W) {
    if (!items.length) return paragraph(doc, '—', y, M, W);
    doc.setFont('helvetica','normal');
    doc.setFontSize(11);
    doc.setTextColor(51,65,85);
    for (const it of items) {
      const lines = doc.splitTextToSize(`• ${it}`, W - 2 * M - 12);
      for (let i=0;i<lines.length;i++) {
        y = ensureSpace(doc, y, 16);
        doc.text(lines[i], M + (i===0?0:12), y);
        y += 14;
      }
    }
    return y + 6;
  }
  function hexToRgb(hex) {
    const h = hex.replace('#','');
    return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
  }

  window.ScamLens.generatePDF = generatePDF;
})();
