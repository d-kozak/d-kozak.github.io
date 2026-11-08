// Shared by the local packager and the browser. No presentation code is executable.
export const MAGIC = new TextEncoder().encode("LVIEW001");
export const MAX_PACKAGE_BYTES = 32 * 1024 * 1024;
export const MAX_JSON_BYTES = 64 * 1024 * 1024;
export const MAX_CHAPTERS = 200;

export function keyBytes(value) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw new Error("Use the 43-character key from your private access link.");
  const bytes = Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/") + "="), c => c.charCodeAt(0));
  const canonical = btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  if (canonical !== value) throw new Error("Invalid key encoding.");
  return bytes;
}

export function envelope(bytes) {
  if (bytes.length > MAX_PACKAGE_BYTES) throw new Error("Package exceeds the 32 MiB prototype limit.");
  if (bytes.length < 37 || !MAGIC.every((v, i) => bytes[i] === v)) throw new Error("Not a supported encrypted presentation package.");
  return { iv: bytes.subarray(8, 20), ciphertext: bytes.subarray(20) };
}

function record(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid presentation object.");
  return value;
}

function text(value, limit = 100000) {
  if (typeof value !== "string" || !value.trim() || value.length > limit) throw new Error("Invalid presentation text.");
  return value;
}

function list(value, limit = 1000) {
  if (!Array.isArray(value) || value.length > limit) throw new Error("Invalid presentation list.");
  return value;
}

function nonempty(value) {
  const items = list(value);
  if (!items.length) throw new Error("Empty presentation list.");
  return items;
}

// Project onto the known schema: never carry arbitrary metadata or executable markup.
export function presentation(value) {
  const data = record(value);
  if (data.version !== 1) throw new Error("Unsupported presentation version.");
  const ids = new Set();
  const chapters = list(data.chapters, MAX_CHAPTERS).map(c => {
    record(c);
    const id = text(c.id, 100);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || ids.has(id)) throw new Error("Invalid or duplicate chapter ID.");
    ids.add(id);
    const duration = record(c.audio).duration;
    if (!Number.isFinite(duration) || duration <= 0 || duration > 86400) throw new Error("Invalid audio duration.");
    const blocks = nonempty(c.blocks).map(b => {
      record(b);
      const title = text(b.title);
      if (b.kind === "steps" || b.kind === "columns") {
        return {kind: b.kind, title, items: nonempty(b.items).map(i => ({label: text(record(i).label), text: text(i.text)}))};
      }
      if (b.kind !== "table") throw new Error("Unsupported block kind.");
      const headers = nonempty(b.headers).map(v => text(v));
      const rows = nonempty(b.rows).map(row => {
        if (list(row).length !== headers.length) throw new Error("Invalid table width.");
        return row.map(v => text(v));
      });
      return {kind: b.kind, title, headers, rows};
    });
    const details = list(c.details ?? []).map(d => ({title: text(record(d).title), text: text(d.text)}));
    const sources = list(c.sources ?? []).map(s => {
      record(s);
      const url = new URL(text(s.url, 8192));
      if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Unsafe source URL.");
      return {label: text(s.label), url: url.href};
    });
    return {id, title: text(c.title), eyebrow: text(c.eyebrow), summary: text(c.summary),
      takeaway: text(c.takeaway), transcript: text(c.transcript), blocks, details, sources, audio: {duration}};
  });
  if (!chapters.length) throw new Error("A presentation needs chapters.");
  return {version: 1, id: text(data.id, 200), title: text(data.title), subtitle: text(data.subtitle), notice: text(data.notice), chapters};
}

export function payload(value) {
  record(value);
  if (value.version !== 1) throw new Error("Unsupported package version.");
  const data = presentation(value.presentation);
  const assets = list(value.audio, MAX_CHAPTERS);
  if (assets.length !== data.chapters.length) throw new Error("Chapter audio is missing.");
  const audio = assets.map(a => {
    record(a);
    if (a.type !== "audio/mpeg" || typeof a.base64 !== "string" || !a.base64.length || a.base64.length % 4 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(a.base64)) throw new Error("Invalid chapter audio.");
    return {type: a.type, base64: a.base64};
  });
  return {version: 1, presentation: data, audio};
}
