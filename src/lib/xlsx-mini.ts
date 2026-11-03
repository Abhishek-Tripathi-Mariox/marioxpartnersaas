// @ts-nocheck
/* eslint-disable */
/* xlsx-mini: tiny dependency-free .xlsx reader/writer for Mariox Control.
   Read: unzips with the browser's DecompressionStream('deflate-raw') and parses the sheet XML.
   Write: stored (uncompressed) zip with inline strings, bold header row, frozen first row and column widths. */
const XLSXmini = (() => {
  'use strict';
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const enc = new TextEncoder(), dec = new TextDecoder();
  function zip(files) {
    const parts = [], central = []; let off = 0;
    files.forEach(([name, text]) => {
      const nb = enc.encode(name), data = typeof text === 'string' ? enc.encode(text) : text, crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nb, data);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), nb); off += 30 + nb.length + data.length;
    });
    const cs = central.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
    const all = [...parts, ...central, new Uint8Array(e.buffer)], out = new Uint8Array(all.reduce((a, b) => a + b.length, 0)); let p = 0; all.forEach(b => { out.set(b, p); p += b.length; }); return out;
  }
  const xe = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const col = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  function sheetXML(rows, widths) {
    const body = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => { if (v == null || v === '') return ''; const ref = col(ci) + (ri + 1), st = ri === 0 ? ' s="1"' : ''; return typeof v === 'number' && isFinite(v) ? `<c r="${ref}"${st}><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${xe(v)}</t></is></c>`; }).join('')}</row>`).join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${widths ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : ''}<sheetData>${body}</sheetData></worksheet>`;
  }
  function write(sheets) {
    const names = sheets.map(([n]) => String(n).replace(/[\\\/?*\[\]:]/g, ' ').slice(0, 31));
    const files = [
      ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
      ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${xe(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
      ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0D0E12"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`]
    ];
    sheets.forEach(([, rows], i) => { const w = (rows[0] || []).map((_, c) => Math.min(48, Math.max(10, ...rows.slice(0, 80).map(r => String(r[c] ?? '').length)) + 2)); files.push([`xl/worksheets/sheet${i + 1}.xml`, sheetXML(rows, w)]); });
    return zip(files);
  }
  async function inflate(bytes) { const ds = new DecompressionStream('deflate-raw'); const s = new Blob([bytes]).stream().pipeThrough(ds); return new Uint8Array(await new Response(s).arrayBuffer()); }
  async function unzip(buf) {
    const u = new Uint8Array(buf), v = new DataView(u.buffer, u.byteOffset, u.byteLength); let e = u.length - 22; while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--; if (e < 0) throw new Error('Not a zip / xlsx file');
    const n = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true); const out = {};
    for (let i = 0; i < n; i++) { const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true); const name = dec.decode(u.subarray(p + 46, p + 46 + nl)); const ds = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true); const data = u.subarray(ds, ds + csize); out[name] = {method, data}; p += 46 + nl + xl + cl; }
    return {async text(name) { const f = out[name] || out[Object.keys(out).find(k => k.toLowerCase() === name.toLowerCase())]; if (!f) return null; return dec.decode(f.method === 8 ? await inflate(f.data) : f.data); }};
  }
  const X = s => new DOMParser().parseFromString(s, 'application/xml');
  const tags = (node, name) => [...node.getElementsByTagNameNS('*', name)];
  async function read(buf) {
    const z = await unzip(buf), wb = X(await z.text('xl/workbook.xml')), rels = X(await z.text('xl/_rels/workbook.xml.rels') || '<r/>');
    const relMap = Object.fromEntries(tags(rels, 'Relationship').map(r => [r.getAttribute('Id'), r.getAttribute('Target')]));
    const ssx = await z.text('xl/sharedStrings.xml'), ss = ssx ? tags(X(ssx), 'si').map(si => tags(si, 't').map(t => t.textContent).join('')) : [];
    const sheets = tags(wb, 'sheet').map(s => ({name:s.getAttribute('name'), target:relMap[s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || s.getAttribute('r:id')]}));
    const cache = {};
    const ci = ref => { const m = /^([A-Z]+)/.exec(ref || ''); if (!m) return -1; let n = 0; for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
    async function rows(name) {
      if (cache[name]) return cache[name]; const s = sheets.find(x => x.name === name); if (!s) return null;
      const path = s.target.startsWith('/') ? s.target.slice(1) : 'xl/' + s.target.replace(/^\.\//, ''), doc = X(await z.text(path) || '<x/>'), out = [];
      tags(doc, 'row').forEach(r => { const ri = (+r.getAttribute('r') || out.length + 1) - 1, row = []; let auto = 0;
        tags(r, 'c').forEach(c => { const ref = c.getAttribute('r'), idx = ref ? ci(ref) : auto; auto = idx + 1; const t = c.getAttribute('t'), vEl = tags(c, 'v')[0], raw = vEl ? vEl.textContent : '';
          let val = ''; if (t === 's') val = ss[+raw] ?? ''; else if (t === 'inlineStr') val = tags(c, 't').map(x => x.textContent).join(''); else if (t === 'str' || t === 'e') val = raw; else if (t === 'b') val = raw === '1'; else val = raw === '' ? '' : (isNaN(+raw) ? raw : +raw);
          row[idx] = val; });
        for (let i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = ''; out[ri] = row; });
      for (let i = 0; i < out.length; i++) if (!out[i]) out[i] = [];
      return (cache[name] = out);
    }
    return {SheetNames:sheets.map(s => s.name), rows};
  }
  return {read, write};
})();

type Cell = string | number | null | undefined;
export default XLSXmini as { write(sheets: [string, Cell[][]][]): Uint8Array; read(buf: ArrayBuffer): Promise<{ SheetNames: string[]; rows(name: string): Promise<unknown[][] | null> }> };
