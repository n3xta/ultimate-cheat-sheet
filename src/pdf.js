// Minimal PDF writer: each page is one full-bleed JPEG, sized in real
// millimetres so it prints 1:1 (double-sided for two-page sheets).

export async function pagesToPdf(canvases, wMm, hMm, quality = 0.92) {
  const enc = new TextEncoder();
  const W = ((wMm / 25.4) * 72).toFixed(2), H = ((hMm / 25.4) * 72).toFixed(2);
  const chunks = [], offsets = [];
  let len = 0;
  const push = (data) => {
    const b = typeof data === 'string' ? enc.encode(data) : data;
    chunks.push(b);
    len += b.length;
  };
  const obj = (id, dict, stream) => {
    offsets[id] = len;
    push(`${id} 0 obj\n${dict}\n`);
    if (stream) {
      push('stream\n');
      push(stream);
      push('\nendstream\n');
    }
    push('endobj\n');
  };

  push('%PDF-1.4\n%âãÏÓ\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  // objects per page i: page 3+3i, image 4+3i, content 5+3i
  const kids = canvases.map((_, i) => `${3 + 3 * i} 0 R`).join(' ');
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${canvases.length} >>`);
  for (let i = 0; i < canvases.length; i++) {
    const c = canvases[i], p = 3 + 3 * i;
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', quality));
    const jpg = new Uint8Array(await blob.arrayBuffer());
    const draw = enc.encode(`q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`);
    obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${p + 1} 0 R >> >> /Contents ${p + 2} 0 R >>`);
    obj(p + 1, `<< /Type /XObject /Subtype /Image /Width ${c.width} /Height ${c.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>`, jpg);
    obj(p + 2, `<< /Length ${draw.length} >>`, draw);
  }

  const size = 3 + 3 * canvases.length, xref = len;
  let table = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let id = 1; id < size; id++) table += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  push(`${table}trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks, { type: 'application/pdf' });
}
