"use strict";

const editor = document.querySelector("#article-editor");

if (editor) {
  const articleId = editor.dataset.articleId;
  const fields = ["title", "summary", "category", "image", "content"]
    .map(name => document.querySelector(`#article-${name}`));
  const saveStatus = document.querySelector("#save-status");
  const submitButton = document.querySelector("#submit-review");
  const submitMessage = document.querySelector("#submit-message");
  let clientId = crypto.randomUUID();
  const handoffKey = `reporter-save:${articleId}`;
  let revision = Number(editor.dataset.saveRevision || 0);
  let sequence = 0;
  let savedSequence = 0;
  let exitSequence = -1;
  let saveTimer = null;
  let inFlight = null;
  let submitting = false;
  let leaving = false;

  function clearHandoff() {
    // The next document may already have read its older server snapshot.
    if (leaving) return;
    try {
      const pending = JSON.parse(sessionStorage.getItem(handoffKey));
      if (pending?.autosave.clientId === clientId &&
          pending.autosave.sequence <= savedSequence) sessionStorage.removeItem(handoffKey);
    } catch (_) { /* Storage may be disabled; server saving still works. */ }
  }

  function snapshot() {
    return JSON.stringify({
      title: fields[0].value,
      summary: fields[1].value,
      category: fields[2].value,
      imageUrl: fields[3].value,
      content: fields[4].value,
      autosave: { clientId, sequence, revision }
    });
  }

  async function saveArticle() {
    clearTimeout(saveTimer);
    if (inFlight) {
      if (!await inFlight) return false;
      return saveArticle();
    }
    if (sequence === savedSequence) return true;

    const savingSequence = sequence;
    const body = snapshot();
    saveStatus.textContent = "Saving...";
    inFlight = (async () => {
      try {
        const response = await fetch(`/api/reporter/articles/${articleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Save failed");
        revision = Math.max(revision, data.revision);
        savedSequence = Math.max(savedSequence, savingSequence);
        clearHandoff();
        saveStatus.textContent = sequence === savedSequence
          ? `Saved at ${new Date(data.savedAt).toLocaleTimeString()}`
          : "Unsaved changes...";
        return true;
      } catch (error) {
        if (savedSequence >= savingSequence) return true;
        saveStatus.textContent = error.message || "Unable to save";
        return false;
      }
    })();
    const saved = await inFlight;
    inFlight = null;
    // Coalesce changes made during the request into one subsequent save.
    if (saved && sequence !== savedSequence) return saveArticle();
    return saved;
  }

  function scheduleSave() {
    leaving = false;
    sequence += 1;
    exitSequence = -1;
    saveStatus.textContent = "Unsaved changes...";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveArticle, 1000);
  }

  function flushOnExit() {
    if (sequence === savedSequence || exitSequence === sequence) return;
    clearTimeout(saveTimer);
    const body = snapshot();
    // Temporary per-tab handoff bridges a reload whose GET overtakes the PATCH.
    // Persistence still comes from MongoDB, including on another computer.
    try { sessionStorage.setItem(handoffKey, body); } catch (_) {}
    // Keepalive has a shared 64 KiB browser budget. Large stories use the
    // normal queue and the beforeunload safeguard instead of silently failing.
    if (new Blob([body]).size > 60000) {
      void saveArticle();
      return;
    }
    const sendingSequence = sequence;
    exitSequence = sendingSequence;
    fetch(`/api/reporter/articles/${articleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true
    }).then(async response => {
      const data = await response.json();
      if (response.ok && sequence === sendingSequence) {
        revision = Math.max(revision, data.revision);
        savedSequence = Math.max(savedSequence, sendingSequence);
        clearHandoff();
        saveStatus.textContent = `Saved at ${new Date(data.savedAt).toLocaleTimeString()}`;
      } else if (!response.ok) {
        exitSequence = -1;
      }
    }).catch(() => { exitSequence = -1; });
  }

  try {
    const pending = JSON.parse(sessionStorage.getItem(handoffKey));
    if (pending?.autosave) {
      const serverSequence = Number(editor.dataset.saveSequence || 0);
      const sameClient = editor.dataset.saveClient === pending.autosave.clientId;
      if ((sameClient && serverSequence >= pending.autosave.sequence) ||
          (!sameClient && revision > pending.autosave.revision)) {
        sessionStorage.removeItem(handoffKey);
      } else {
        clientId = pending.autosave.clientId;
        sequence = pending.autosave.sequence;
        revision = pending.autosave.revision;
        ["title", "summary", "category", "imageUrl", "content"].forEach((name, i) => {
          fields[i].value = pending[name];
        });
        void saveArticle();
      }
    }
  } catch (_) { /* No usable handoff. Rendered server values remain intact. */ }

  fields.forEach(field => field.addEventListener("input", scheduleSave));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushOnExit();
  });
  window.addEventListener("pagehide", () => { leaving = true; flushOnExit(); });
  window.addEventListener("beforeunload", event => {
    leaving = true;
    flushOnExit();
    if (sequence !== savedSequence && new Blob([snapshot()]).size > 60000) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  submitButton.addEventListener("click", async () => {
    if (submitting) return;
    submitting = true;
    submitButton.disabled = true;
    fields.forEach(field => { field.disabled = true; });
    submitMessage.textContent = "";
    try {
      if (!await saveArticle()) {
        submitMessage.textContent = "Please save the article before submitting";
        return;
      }
      const response = await fetch(`/api/reporter/articles/${articleId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending" })
      });
      const data = await response.json();
      if (!response.ok) {
        submitMessage.textContent = data.message || "Unable to submit article";
        return;
      }
      window.location.href = "/reporter";
    } catch (error) {
      submitMessage.textContent = "Unable to connect to the server";
    } finally {
      submitting = false;
      submitButton.disabled = false;
      fields.forEach(field => { field.disabled = false; });
    }
  });
}
