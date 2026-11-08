import {MAGIC, MAX_JSON_BYTES, MAX_PACKAGE_BYTES, envelope, keyBytes, payload} from "./encrypted-format.mjs";

const $ = id => document.getElementById(id);
let key = null;
const objectURLs = [];

function status(message) {
  $("unlock-status").textContent = message;
}

async function importKey(value) {
  const bytes = keyBytes(value);
  try {
    return await crypto.subtle.importKey("raw", bytes, {name: "AES-GCM"}, false, ["decrypt"]);
  } finally {
    bytes.fill(0);
  }
}

function pastedKey(value) {
  value = value.trim();
  if (/^https?:\/\//.test(value)) return new URLSearchParams(new URL(value).hash.slice(1)).get("key") ?? "";
  return value;
}

async function inflate(bytes) {
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")).getReader();
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_JSON_BYTES) throw new Error("Decoded package is too large.");
      parts.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const output = new Uint8Array(size);
  let position = 0;
  for (const part of parts) {
    output.set(part, position);
    position += part.length;
  }
  return output;
}

function revokeAudio() {
  for (const url of objectURLs) URL.revokeObjectURL(url);
  objectURLs.length = 0;
}

async function initialize() {
  let fragment = location.hash;
  // Remove the key from this history entry before any user navigation. Earlier
  // browser history, synced URLs, messages, and clipboard copies may still hold it.
  if (fragment) history.replaceState(null, "", location.pathname + location.search);
  if (!isSecureContext || !globalThis.crypto?.subtle || !globalThis.DecompressionStream) {
    status("Use an up-to-date browser over HTTPS (or localhost for testing). This browser cannot decrypt packages.");
    $("unlock-button").disabled = true;
    return;
  }
  if (fragment) {
    try {
      key = await importKey(new URLSearchParams(fragment.slice(1)).get("key") ?? "");
      status("Key loaded from your link. Select the downloaded presentation package.");
      $("unlock-key").placeholder = "Key already loaded; leave blank";
    } catch {
      status("The link has no valid key. Paste your private access link or key below.");
    }
    fragment = "";
  }
  $("unlock-button").disabled = false;
}

$("unlock-form").addEventListener("submit", async event => {
  event.preventDefault();
  const file = $("package-file").files[0];
  if (!file) return status("Select the presentation.enc file downloaded from Drive.");
  if (file.size > MAX_PACKAGE_BYTES) return status("Package exceeds the 32 MiB prototype limit.");
  $("unlock-button").disabled = true;
  try {
    const entered = $("unlock-key").value;
    $("unlock-key").value = "";
    if (entered.trim()) {
      key = null;
      key = await importKey(pastedKey(entered));
    }
    if (!key) throw new Error("Missing key.");
    status("Decrypting on this device. Nothing is uploaded…");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const {iv, ciphertext} = envelope(bytes);
    // Authentication must succeed before decompression or parsing untrusted data.
    const compressed = await crypto.subtle.decrypt({name: "AES-GCM", iv, additionalData: MAGIC, tagLength: 128}, key, ciphertext);
    const decoded = await inflate(compressed);
    const value = payload(JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(decoded)));
    for (let index = 0; index < value.audio.length; index++) {
      const asset = value.audio[index];
      const raw = Uint8Array.from(atob(asset.base64), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([raw], {type: asset.type}));
      objectURLs.push(url);
      value.presentation.chapters[index].audio.src = url;
    }
    $("presentation").textContent = JSON.stringify(value.presentation);
    $("private-viewer").hidden = false;
    await import("./viewer.js");
    $("presentation").textContent = "";
    $("unlock").hidden = true;
    $("package-file").value = "";
    key = null;
    $("chapter").focus();
    window.scrollTo(0, 0);
  } catch {
    revokeAudio();
    $("private-viewer").hidden = true;
    $("presentation").textContent = "";
    status("Could not open the package. Check the key and file, or download the package again. It may be damaged or unsupported.");
  } finally {
    $("unlock-button").disabled = false;
  }
});

$("close-presentation").addEventListener("click", () => {
  $("audio").pause();
  revokeAudio();
  key = null;
  // Reload to discard the renderer's in-memory content and require unlocking again.
  location.reload();
});

initialize().catch(() => status("Could not initialize the viewer. Reload the page over HTTPS."));
