"use strict";

(function attachQuickNote(global) {
  const HISTORY_LIMIT = 30;
  const AUTOSAVE_DELAY = 250;
  const HISTORY_SNAPSHOT_DELAY = 1200;

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function highlightMarkdown(markdown) {
    const highlighted = markdown.split("\n").map((line) => {
      const escaped = escapeHtml(line);
      const heading = line.match(/^(#{1,6})(\s+)(.*)$/);
      if (heading) {
        return `<span class="qn-md-heading qn-md-heading-${heading[1].length}"><span class="qn-md-heading-marker">${escapeHtml(heading[1])}</span>${escapeHtml(heading[2] + heading[3])}</span>`;
      }

      const list = line.match(/^(\s*)([-+*]|\d+\.)(\s+)(.*)$/);
      if (list) {
        return `<span class="qn-md-list">${escapeHtml(list[1])}<span class="qn-md-list-marker">${escapeHtml(list[2])}</span>${escapeHtml(list[3] + list[4])}</span>`;
      }

      if (/^\s*---+\s*$/.test(line)) {
        return `<span class="qn-md-delimiter"><span class="qn-md-delimiter-text">${escaped}</span></span>`;
      }

      return escaped || "\u200b";
    }).join("\n");

    return `${highlighted}\n`;
  }

  function wordsIn(value) {
    const prose = value
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*(?:[-+*]|\d+\.)\s+/gm, "")
      .replace(/^\s*---+\s*$/gm, "");
    return prose.trim().match(/\S+/g)?.length || 0;
  }

  function noteTitle(content) {
    const firstMeaningfulLine = content.split("\n").find((line) => line.trim())?.trim() || "Untitled note";
    return firstMeaningfulLine.replace(/^#{1,6}\s*/, "").slice(0, 80) || "Untitled note";
  }

  function noteFilename(content) {
    const slug = noteTitle(content)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "quick-note";
    const date = new Date().toISOString().slice(0, 10);
    return `${date}-${slug}.md`;
  }

  function createId() {
    return global.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function create({ root, storageKey = "start-md:quick-notes", standalone = false, onClose = null } = {}) {
    if (!root) throw new Error("QuickNote requires a root element");

    root.classList.add("quick-note-host");
    root.innerHTML = `
      <section class="qn-shell" role="dialog" aria-modal="true" aria-label="Quick note editor">
        <header class="qn-header">
          <span class="qn-brand"><span>quick note</span></span>
          <span class="qn-status" data-role="status">local draft</span>
          <span class="qn-spacer"></span>
          <button class="qn-action" type="button" data-action="history">[history]</button>
          <button class="qn-action" type="button" data-action="copy">[copy]</button>
          <button class="qn-action qn-action-primary" type="button" data-action="save"><span class="qn-key">⌘s</span> save .md</button>
          <button class="qn-action" type="button" data-action="close"><span class="qn-key">esc</span> ${standalone ? "new" : "close"}</button>
        </header>

        <div class="qn-workspace">
          <div class="qn-editor-stack">
            <pre class="qn-highlight" aria-hidden="true"><code data-role="highlight"></code></pre>
            <textarea class="qn-editor" data-role="editor" aria-label="Markdown note" placeholder="# Start typing…" spellcheck="true"></textarea>
          </div>
        </div>

        <footer class="qn-footer">
          <span class="qn-word-count" data-role="word-count">local draft · 0 words</span>
          <span class="qn-spacer"></span>
          <span class="qn-hint">Markdown headings, lists, and --- are highlighted</span>
        </footer>

        <aside class="qn-history" data-role="history" aria-label="Recent notes" hidden>
          <div class="qn-history-header">
            <span>./Recent notes</span>
            <span class="qn-spacer"></span>
            <button class="qn-action" type="button" data-action="new">+ new</button>
            <button class="qn-action" type="button" data-action="hide-history" aria-label="Hide history">×</button>
          </div>
          <div class="qn-history-list" data-role="history-list"></div>
        </aside>
      </section>`;

    if (standalone) root.classList.add("qn-standalone");

    const editor = root.querySelector('[data-role="editor"]');
    const highlight = root.querySelector('[data-role="highlight"]');
    const status = root.querySelector('[data-role="status"]');
    const wordCount = root.querySelector('[data-role="word-count"]');
    const historyPanel = root.querySelector('[data-role="history"]');
    const historyList = root.querySelector('[data-role="history-list"]');
    const draftKey = `${storageKey}:draft`;
    const historyKey = `${storageKey}:history`;

    let currentId = null;
    let currentCreatedAt = Date.now();
    let autosaveTimer = null;
    let historySnapshotTimer = null;
    let flashTimer = null;
    let memoryDraft = null;
    let memoryHistory = [];

    function readJson(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
      } catch {
        return key === draftKey ? (memoryDraft || fallback) : memoryHistory;
      }
    }

    function writeJson(key, value) {
      if (key === draftKey) memoryDraft = value;
      if (key === historyKey) memoryHistory = value;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // The in-memory fallback still keeps the editor usable for this page session.
      }
    }

    function removeStored(key) {
      if (key === draftKey) memoryDraft = null;
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore storage failures; the in-memory draft has already been cleared.
      }
    }

    function history() {
      const value = readJson(historyKey, []);
      return Array.isArray(value) ? value : [];
    }

    function renderEditor() {
      highlight.innerHTML = highlightMarkdown(editor.value);
      const count = wordsIn(editor.value);
      wordCount.textContent = `local draft · ${count} ${count === 1 ? "word" : "words"}`;
    }

    function syncScroll() {
      const pre = highlight.parentElement;
      pre.scrollTop = editor.scrollTop;
      pre.scrollLeft = editor.scrollLeft;
    }

    function saveDraft() {
      writeJson(draftKey, {
        id: currentId,
        content: editor.value,
        createdAt: currentCreatedAt,
        updatedAt: Date.now(),
      });
      status.textContent = "saved locally just now";
    }

    function snapshotHistory() {
      const content = editor.value.trimEnd();
      if (!content.trim()) return null;

      const notes = history();
      const now = Date.now();
      if (!currentId) currentId = createId();
      const existing = notes.findIndex((note) => note.id === currentId);
      const note = {
        id: currentId,
        content,
        createdAt: existing >= 0 ? notes[existing].createdAt : currentCreatedAt,
        updatedAt: now,
      };
      if (existing >= 0) notes.splice(existing, 1);
      notes.unshift(note);
      writeJson(historyKey, notes.slice(0, HISTORY_LIMIT));
      renderHistory();
      return note;
    }

    function schedulePersistence() {
      clearTimeout(autosaveTimer);
      clearTimeout(historySnapshotTimer);
      status.textContent = "saving locally…";
      autosaveTimer = setTimeout(saveDraft, AUTOSAVE_DELAY);
      historySnapshotTimer = setTimeout(snapshotHistory, HISTORY_SNAPSHOT_DELAY);
    }

    function formatNoteDate(timestamp) {
      const date = new Date(timestamp);
      const today = new Date();
      const sameDay = date.toDateString() === today.toDateString();
      return sameDay
        ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : date.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    function renderHistory() {
      historyList.replaceChildren();
      const notes = history();
      if (notes.length === 0) {
        historyList.append(Object.assign(document.createElement("p"), {
          className: "qn-history-empty",
          textContent: "No recovered notes yet.",
        }));
        return;
      }

      for (const note of notes) {
        const row = document.createElement("div");
        row.className = "qn-history-item";
        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "qn-history-open";
        openButton.dataset.noteId = note.id;
        const title = document.createElement("span");
        title.className = "qn-history-title";
        title.textContent = noteTitle(note.content);
        const count = wordsIn(note.content);
        const meta = document.createElement("span");
        meta.className = "qn-history-meta";
        meta.textContent = `${formatNoteDate(note.updatedAt)} · ${count} ${count === 1 ? "word" : "words"}`;
        openButton.append(title, meta);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "qn-history-delete";
        deleteButton.dataset.deleteNoteId = note.id;
        deleteButton.setAttribute("aria-label", `Delete ${title.textContent}`);
        deleteButton.textContent = "×";
        row.append(openButton, deleteButton);
        historyList.append(row);
      }
    }

    function loadNote(note) {
      currentId = note.id;
      currentCreatedAt = note.createdAt || Date.now();
      editor.value = note.content;
      saveDraft();
      renderEditor();
      hideHistory();
      editor.focus();
      editor.setSelectionRange(editor.value.length, editor.value.length);
    }

    function startNew() {
      snapshotHistory();
      currentId = null;
      currentCreatedAt = Date.now();
      editor.value = "";
      removeStored(draftKey);
      renderEditor();
      hideHistory();
      editor.focus();
    }

    function showHistory() {
      snapshotHistory();
      renderHistory();
      historyPanel.hidden = false;
      historyPanel.querySelector("button")?.focus();
    }

    function hideHistory() {
      historyPanel.hidden = true;
    }

    function flash(message) {
      clearTimeout(flashTimer);
      status.textContent = message;
      status.classList.add("qn-flash");
      flashTimer = setTimeout(() => {
        status.classList.remove("qn-flash");
        status.textContent = "saved locally";
      }, 1800);
    }

    async function copyNote() {
      const content = editor.value;
      try {
        await navigator.clipboard.writeText(content);
      } catch {
        editor.focus();
        editor.select();
        document.execCommand("copy");
        editor.setSelectionRange(content.length, content.length);
      }
      snapshotHistory();
      saveDraft();
      flash("copied to clipboard");
    }

    function downloadNote() {
      const content = editor.value;
      const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = noteFilename(content);
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      snapshotHistory();
      saveDraft();
      flash(`saved ${anchor.download}`);
    }

    function open() {
      root.hidden = false;
      document.body.classList.add("quick-note-open");
      hideHistory();
      const draft = readJson(draftKey, null);
      if (draft?.content && !editor.value) {
        currentId = draft.id || null;
        currentCreatedAt = draft.createdAt || Date.now();
        editor.value = draft.content;
      }
      renderEditor();
      requestAnimationFrame(() => {
        editor.focus();
        editor.setSelectionRange(editor.value.length, editor.value.length);
      });
    }

    function close() {
      if (!historyPanel.hidden) {
        hideHistory();
        editor.focus();
        return;
      }
      snapshotHistory();
      clearTimeout(autosaveTimer);
      clearTimeout(historySnapshotTimer);
      removeStored(draftKey);
      currentId = null;
      currentCreatedAt = Date.now();
      editor.value = "";
      renderEditor();
      if (standalone) {
        editor.focus();
      } else {
        root.hidden = true;
        document.body.classList.remove("quick-note-open");
        onClose?.();
      }
    }

    function isOpen() {
      return !root.hidden;
    }

    editor.addEventListener("input", () => {
      renderEditor();
      schedulePersistence();
    });
    editor.addEventListener("scroll", syncScroll);

    root.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "history") showHistory();
      if (action === "hide-history") hideHistory();
      if (action === "copy") copyNote();
      if (action === "save") downloadNote();
      if (action === "close") close();
      if (action === "new") startNew();

      const noteId = event.target.closest("[data-note-id]")?.dataset.noteId;
      if (noteId) {
        const note = history().find((candidate) => candidate.id === noteId);
        if (note) loadNote(note);
      }

      const deleteId = event.target.closest("[data-delete-note-id]")?.dataset.deleteNoteId;
      if (deleteId) {
        writeJson(historyKey, history().filter((note) => note.id !== deleteId));
        if (currentId === deleteId) currentId = null;
        renderHistory();
      }
    });

    global.addEventListener("pagehide", () => {
      if (!isOpen()) return;
      clearTimeout(autosaveTimer);
      clearTimeout(historySnapshotTimer);
      saveDraft();
      snapshotHistory();
    });

    document.addEventListener("keydown", (event) => {
      if (!isOpen()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        event.stopImmediatePropagation();
        downloadNote();
      }
    });

    const draft = readJson(draftKey, null);
    if (draft?.content) {
      currentId = draft.id || null;
      currentCreatedAt = draft.createdAt || Date.now();
      editor.value = draft.content;
    }
    renderEditor();
    renderHistory();

    if (standalone) open();
    else root.hidden = true;

    return { open, close, isOpen, startNew, copyNote, downloadNote };
  }

  global.QuickNote = { create };
})(window);
