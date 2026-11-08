"use strict";
(() => {
  const data = JSON.parse(document.getElementById("presentation").textContent);
  const rememberProgress = document.getElementById("presentation").dataset.persist !== "false";
  const $ = id => document.getElementById(id);
  const audio = $("audio");
  const chapters = data.chapters;
  const storageKey = `listening-viewer:v1:${data.id}`;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const duration = () => chapters[index].audio.duration;
  const clock = seconds => {
    const n = Math.max(0, Math.floor(seconds || 0));
    return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  };
  const node = (tag, content, className) => {
    const el = document.createElement(tag);
    if (content !== undefined) el.textContent = content;
    if (className) el.className = className;
    return el;
  };
  let saved = {};
  if (rememberProgress) {
    try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { /* Storage is optional for file URLs. */ }
  }
  if (typeof saved !== "object" || Array.isArray(saved)) saved = {};
  let index = 0;
  let generation = 0;
  let pendingPosition = 0;
  let wantedPlayback = false;
  let lastSave = 0;
  const total = chapters.reduce((sum, c) => sum + c.audio.duration, 0);
  const initialIndex = Math.max(0, chapters.findIndex(c => c.id === saved.chapter));
  const speeds = new Set([0.75, 1, 1.25, 1.5, 1.75, 2]);
  $("speed").value = String(speeds.has(saved.speed) ? saved.speed : 1);
  $("continuous").checked = saved.continuous !== false;
  $("repeat").checked = saved.repeat === true;
  $("title").textContent = data.title;
  $("subtitle").textContent = data.subtitle;
  $("notice").textContent = data.notice;
  $("chapter-count").textContent = String(chapters.length).padStart(2, "0");
  $("session-duration").textContent = `${chapters.length} chapters · ${clock(total)} at 1×`;

  function persist() {
    if (!rememberProgress) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        chapter: chapters[index].id,
        position: audio.readyState ? audio.currentTime : pendingPosition,
        speed: Number($("speed").value), continuous: $("continuous").checked,
        repeat: $("repeat").checked
      }));
    } catch { /* Private browsing or disabled local storage must not prevent playback. */ }
  }

  function showError(message) {
    $("error").textContent = message;
    $("error").hidden = !message;
  }

  function update() {
    const time = clamp(audio.readyState ? audio.currentTime : pendingPosition, 0, duration());
    $("seek").value = String(time);
    $("seek").setAttribute("aria-valuetext", `${clock(time)} of ${clock(duration())}`);
    $("chapter-time").textContent = `${clock(time)} / ${clock(duration())}`;
    const position = chapters.slice(0, index).reduce((sum, c) => sum + c.audio.duration, 0) + time;
    $("overall").value = position / total;
    $("overall-time").textContent = `${clock(position)} / ${clock(total)}`;
    $("play").textContent = audio.paused ? "Play" : "Pause";
    $("play").setAttribute("aria-label", audio.paused ? "Play" : "Pause");
  }

  function renderBlock(block) {
    const section = node("section", undefined, "visual");
    section.append(node("h3", block.title));
    if (block.kind === "table") {
      const wrapper = node("div", undefined, "table-wrap");
      const table = node("table");
      const caption = node("caption", block.title, "sr-only");
      const head = node("thead");
      const row = node("tr");
      block.headers.forEach(label => {
        const cell = node("th", label);
        cell.scope = "col";
        row.append(cell);
      });
      head.append(row);
      const body = node("tbody");
      block.rows.forEach(values => {
        const tr = node("tr");
        values.forEach(value => tr.append(node("td", value)));
        body.append(tr);
      });
      table.append(caption, head, body);
      wrapper.append(table);
      section.append(wrapper);
    } else {
      const list = node(block.kind === "steps" ? "ol" : "div", undefined, block.kind);
      block.items.forEach(item => {
        const card = node(block.kind === "steps" ? "li" : "div", undefined, block.kind === "steps" ? "step" : "column");
        const content = node("div");
        content.append(node("strong", item.label), node("p", item.text));
        card.append(content);
        list.append(card);
      });
      section.append(list);
    }
    return section;
  }

  async function start() {
    wantedPlayback = true;
    if (!audio.readyState) {
      $("play-state").textContent = "Loading audio…";
      return;
    }
    if (audio.ended || audio.currentTime >= duration() - 0.02) audio.currentTime = 0;
    const current = generation;
    try {
      await audio.play();
      if (current !== generation) return;
      showError("");
    } catch (error) {
      if (current !== generation || error.name === "AbortError") return;
      wantedPlayback = false;
      $("play-state").textContent = "Playback unavailable";
      showError("Could not start audio. Click Play again; if this persists, check that the audio folder is beside index.html.");
    }
    update();
  }

  function pause() {
    wantedPlayback = false;
    audio.pause();
    $("play-state").textContent = "Paused";
    update();
    persist();
  }

  function choose(nextIndex, play = false, position = 0, scroll = true) {
    if (nextIndex < 0 || nextIndex >= chapters.length) return;
    generation += 1;
    wantedPlayback = false;
    audio.pause();
    index = nextIndex;
    const chapter = chapters[index];
    pendingPosition = clamp(Number.isFinite(position) ? position : 0, 0, chapter.audio.duration);
    $("eyebrow").textContent = chapter.eyebrow;
    $("chapter-meta").textContent = `Chapter ${index + 1} of ${chapters.length} · ${clock(duration())}`;
    $("chapter-title").textContent = chapter.title;
    $("chapter-summary").textContent = chapter.summary;
    $("takeaway").textContent = chapter.takeaway;
    $("now-playing").textContent = chapter.title;
    $("blocks").replaceChildren(...chapter.blocks.map(renderBlock));
    $("details").replaceChildren(...(chapter.details || []).map(item => {
      const detail = node("details");
      detail.append(node("summary", item.title), node("p", item.text));
      return detail;
    }));
    $("transcript").replaceChildren(...chapter.transcript.split(/\n\s*\n/).map(p => node("p", p)));
    $("transcript-panel").open = false;
    $("sources").replaceChildren(...(chapter.sources || []).map(source => {
      const link = node("a", `${source.label} ↗`);
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      return link;
    }));
    document.querySelectorAll(".chapter-button").forEach((button, i) => button.setAttribute("aria-current", String(i === index)));
    $("previous").disabled = index === 0;
    $("next").disabled = index === chapters.length - 1;
    $("seek").max = String(duration());
    $("seek").disabled = true;
    showError("");
    $("play-state").textContent = play ? "Loading audio…" : "Ready when you are";
    audio.src = chapter.audio.src;
    audio.load();
    audio.playbackRate = Number($("speed").value);
    wantedPlayback = play;
    update();
    if (scroll) window.scrollTo({top: 0, behavior: "instant"});
    persist();
  }

  chapters.forEach((chapter, i) => {
    const button = node("button", undefined, "chapter-button");
    const label = node("span");
    label.append(node("strong", chapter.title), node("small", `${clock(chapter.audio.duration)} · ${chapter.eyebrow}`));
    button.append(node("span", String(i + 1).padStart(2, "0"), "chapter-number"), label);
    button.addEventListener("click", () => choose(i, wantedPlayback || !audio.paused));
    $("chapters").append(button);
  });

  audio.addEventListener("loadedmetadata", () => {
    audio.currentTime = pendingPosition;
    audio.playbackRate = Number($("speed").value);
    $("seek").disabled = false;
    if (Math.abs(audio.duration - duration()) > 0.15) {
      showError("Audio duration differs from the presentation. Rebuild this bundle before relying on chapter timings.");
    }
    update();
    if (wantedPlayback) start();
  });
  audio.addEventListener("timeupdate", () => {
    update();
    if (Date.now() - lastSave > 1000) { persist(); lastSave = Date.now(); }
  });
  audio.addEventListener("playing", () => {
    // A queued event from a seek/play may arrive after an explicit pause.
    if (audio.paused || audio.ended) return;
    wantedPlayback = true;
    $("play-state").textContent = "Playing";
    update();
  });
  audio.addEventListener("pause", update);
  audio.addEventListener("ended", () => {
    wantedPlayback = false;
    if ($("repeat").checked) {
      audio.currentTime = 0;
      start();
    } else if ($("continuous").checked && index + 1 < chapters.length) {
      choose(index + 1, true);
    } else {
      $("play-state").textContent = index === chapters.length - 1 ? "Session complete" : "Chapter complete";
      update();
      persist();
    }
  });
  audio.addEventListener("error", () => {
    wantedPlayback = false;
    $("play-state").textContent = "Audio unavailable";
    showError("Cannot load this chapter’s audio. Keep the audio folder beside index.html and check that the WAV file is readable.");
    update();
  });

  function seekTo(time) {
    if (!audio.readyState) return;
    audio.currentTime = clamp(time, 0, duration());
    pendingPosition = audio.currentTime;
    update();
    persist();
  }
  $("play").addEventListener("click", () => wantedPlayback || !audio.paused ? pause() : start());
  $("previous").addEventListener("click", () => choose(index - 1, wantedPlayback || !audio.paused));
  $("next").addEventListener("click", () => choose(index + 1, wantedPlayback || !audio.paused));
  $("back").addEventListener("click", () => seekTo(audio.currentTime - 10));
  $("forward").addEventListener("click", () => seekTo(audio.currentTime + 10));
  $("seek").addEventListener("input", event => seekTo(Number(event.target.value)));
  $("speed").addEventListener("change", () => { audio.playbackRate = Number($("speed").value); persist(); });
  $("continuous").addEventListener("change", persist);
  $("repeat").addEventListener("change", persist);
  document.addEventListener("keydown", event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest("input,select,textarea,button,a,summary,[contenteditable]")) return;
    if (event.code === "Space") { event.preventDefault(); $("play").click(); }
    if (event.code === "ArrowLeft") { event.preventDefault(); seekTo(audio.currentTime - 10); }
    if (event.code === "ArrowRight") { event.preventDefault(); seekTo(audio.currentTime + 10); }
  });
  window.addEventListener("pagehide", persist);
  document.addEventListener("visibilitychange", () => { if (document.hidden) persist(); });
  // Keep content above the actual player height at all window sizes and on errors.
  new ResizeObserver(entries => {
    document.documentElement.style.setProperty("--footer", `${Math.ceil(entries[0].target.getBoundingClientRect().height)}px`);
  }).observe(document.querySelector(".player"));
  choose(initialIndex, false, saved.position || 0, false);
})();
