"use strict";

(function () {
  const dialog = document.querySelector("#login-dialog");
  if (dialog && typeof dialog.showModal === "function" && !document.body.hasAttribute("data-login-page")) {
    let opener;
    document.querySelectorAll("[data-login-trigger]").forEach(link => {
      link.addEventListener("click", event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        opener = link;
        dialog.showModal();
        document.body.classList.add("modal-open");
        dialog.querySelector("input").focus();
      });
    });
    dialog.querySelector(".login-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
    dialog.addEventListener("close", () => {
      document.body.classList.remove("modal-open");
      dialog.querySelector("form").reset();
      const target = opener?.getClientRects().length ? opener : document.querySelector("#menu-toggle");
      target?.focus();
    });
  }

  // Native selects remain the source of truth and the submitted form fields.
  document.querySelectorAll("select:not(.analytics-data-select)").forEach((select, index) => {
    const label = select.closest("label");
    const fieldName = label?.querySelector("span")?.textContent.trim() || select.getAttribute("aria-label") || "Choice";
    // A popup contains several buttons, so it must not sit inside a form label.
    // Preserve the field's layout and accessible button name when enhancing it.
    if (label) {
      const field = document.createElement("div");
      field.className = label.className;
      while (label.firstChild) field.append(label.firstChild);
      label.replaceWith(field);
    }
    const wrapper = document.createElement("div");
    wrapper.className = "analytics-custom-select site-select";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "analytics-select-button";
    button.id = `compact-trigger-${index}`;
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    const value = document.createElement("span");
    value.className = "analytics-select-value";
    const chevron = document.createElement("span");
    chevron.className = "analytics-select-chevron";
    chevron.textContent = "⌄";
    chevron.setAttribute("aria-hidden", "true");
    button.append(value, chevron);
    const menu = document.createElement("div");
    menu.className = "analytics-select-menu";
    menu.id = `compact-menu-${index}`;
    menu.hidden = true;
    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-label", fieldName);
    button.setAttribute("aria-controls", menu.id);
    select.before(wrapper);
    wrapper.append(button, menu, select);
    select.classList.add("site-select-native");
    select.tabIndex = -1;
    const surface = wrapper.closest(".management-card, .management-panel, .dashboard-controls-panel, .feed-controls-panel, .analytics-toolbar");
    const options = Array.from(select.options).map((option, optionIndex) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "analytics-select-option";
      item.setAttribute("role", "option");
      item.tabIndex = -1;
      item.textContent = option.textContent.trim();
      item.disabled = option.disabled;
      item.addEventListener("click", () => {
        select.selectedIndex = optionIndex;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        close(true);
      });
      menu.append(item);
      return item;
    });
    function sync() {
      value.textContent = select.selectedOptions[0]?.textContent.trim() || "Choose";
      button.setAttribute("aria-label", `${fieldName}: ${value.textContent}`);
      button.disabled = select.disabled;
      options.forEach((item, i) => {
        item.setAttribute("aria-selected", String(i === select.selectedIndex));
        item.classList.toggle("is-selected", i === select.selectedIndex);
      });
    }
    function close(restore = false) {
      const wasOpen = !menu.hidden;
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
      wrapper.classList.remove("is-open");
      if (wasOpen) surface?.classList.remove("dropdown-surface-open");
      if (restore) button.focus();
    }
    function open() {
      sync();
      surface?.classList.add("dropdown-surface-open");
      menu.hidden = false;
      wrapper.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      const below = window.innerHeight - button.getBoundingClientRect().bottom - 16;
      const above = button.getBoundingClientRect().top - 16;
      const upward = below < 160 && above > below;
      wrapper.classList.toggle("opens-up", upward);
      menu.style.maxHeight = `${Math.max(80, Math.min(260, upward ? above : below))}px`;
      (options[select.selectedIndex] || options[0])?.focus();
    }
    button.addEventListener("click", () => menu.hidden ? open() : close());
    button.addEventListener("keydown", event => {
      if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); open(); }
    });
    let typed = "";
    let typeTimer;
    menu.addEventListener("keydown", event => {
      const enabled = options.filter(item => !item.disabled);
      const current = enabled.indexOf(document.activeElement);
      let next;
      if (event.key === "ArrowDown") next = Math.min(current + 1, enabled.length - 1);
      if (event.key === "ArrowUp") next = Math.max(current - 1, 0);
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = enabled.length - 1;
      if (next !== undefined) { event.preventDefault(); enabled[next]?.focus(); }
      if (event.key === "Escape") { event.preventDefault(); close(true); }
      if (event.key === "Tab") close();
      if (event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey) {
        typed += event.key.toLowerCase();
        clearTimeout(typeTimer);
        typeTimer = setTimeout(() => { typed = ""; }, 600);
        enabled.find(item => item.textContent.toLowerCase().startsWith(typed))?.focus();
      }
    });
    document.addEventListener("click", event => { if (!wrapper.contains(event.target)) close(); });
    wrapper.addEventListener("focusout", event => { if (!wrapper.contains(event.relatedTarget)) close(); });
    select.addEventListener("change", sync);
    select.addEventListener("invalid", () => button.focus());
    select.form?.addEventListener("reset", () => setTimeout(sync, 0));
    window.addEventListener("resize", () => close());
    sync();
  });
})();
