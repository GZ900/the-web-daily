"use strict";

(function () {
  const category = document.querySelector("#feed-category");
  if (category) {
    document.querySelector(".feed-category-fallback").hidden = true;
    let jumpAfterLoad = false;
    function showArchive() {
      document.querySelector("#all-stories").scrollIntoView({ behavior: "instant", block: "start" });
      document.querySelector("#all-stories-heading").focus({ preventScroll: true });
    }
    document.addEventListener("feed:updated", event => {
      if (event.detail.reset && jumpAfterLoad) {
        jumpAfterLoad = false;
        showArchive();
      }
    });
    const topicLinks = document.querySelectorAll("[data-feed-category]");
    function syncTopics() {
      document.querySelectorAll(".topic-navigation [data-feed-category]").forEach(link => {
        if (link.dataset.feedCategory === category.value) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
      document.querySelector("#feed-context").textContent = category.value
        ? `${category.value} stories` : "The complete newsroom archive.";
    }
    topicLinks.forEach(link => link.addEventListener("click", event => {
      // Preserve open-in-new-tab and other normal link actions.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      jumpAfterLoad = !link.closest(".archive-topics");
      category.value = link.dataset.feedCategory;
      category.dispatchEvent(new Event("change", { bubbles: true }));
      history.replaceState(null, "", `${location.pathname}${location.search}#all-stories`);
      if (jumpAfterLoad) showArchive();
    }));
    category.addEventListener("change", syncTopics);
    syncTopics();
  }

  // Home only: scroll direction controls visibility; position determines the destination.
  const scrollButton = document.querySelector("#smart-scroll");
  if (scrollButton) {
    const archive = document.querySelector("#all-stories");
    const controls = archive.querySelector(".feed-controls-panel");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lastScrollY = Math.max(0, window.scrollY);
    scrollButton.hidden = false;

    function updateDestination() {
      // Once well past the filters, return to them before going to the page top.
      const deepInFeed = controls.getBoundingClientRect().bottom < -160;
      const label = deepInFeed ? "Back to All Stories" : "Back to top";
      if (scrollButton.title !== label) {
        scrollButton.setAttribute("aria-label", label);
        scrollButton.title = label;
      }
      return deepInFeed;
    }

    function wouldCoverLinkOrControl() {
      const rect = scrollButton.getBoundingClientRect();
      // Native hit testing avoids covering links without scanning the infinite feed.
      const points = [[.5, .5], [.1, .1], [.9, .1], [.1, .9], [.9, .9]];
      return points.some(([x, y]) => document.elementsFromPoint(
        rect.left + rect.width * x, rect.top + rect.height * y
      ).some(element => !scrollButton.contains(element) &&
        element.closest("a, button, input, select, textarea")));
    }

    window.addEventListener("scroll", () => {
      const currentY = Math.max(0, window.scrollY);
      updateDestination();
      if (currentY < 240) {
        scrollButton.classList.remove("is-visible");
        lastScrollY = currentY;
        return;
      }
      const difference = currentY - lastScrollY;
      // Accumulate small movements instead of flickering with each scroll pixel.
      if (Math.abs(difference) < 12) return;
      scrollButton.classList.toggle("is-visible", difference < 0 && !wouldCoverLinkOrControl());
      lastScrollY = currentY;
    }, { passive: true });

    scrollButton.addEventListener("click", () => {
      const behavior = reducedMotion.matches ? "instant" : "smooth";
      if (updateDestination()) {
        archive.scrollIntoView({ behavior, block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior });
        document.querySelector(".brand-lockup").focus({ preventScroll: true });
      }
    });
    window.addEventListener("resize", updateDestination);
    updateDestination();
  }

  // Existing article imagery is optional: never substitute unrelated stock art.
  document.querySelectorAll(".editorial-story img, .news-card-image, .article-hero").forEach(image => {
    function fallback() {
      const story = image.closest(".editorial-story, .news-card");
      if (story) {
        story.classList.remove("story-has-image");
        story.classList.add(story.classList.contains("news-card") ? "news-card--no-image" : "story-no-image");
        image.closest(".story-media, .news-card-image-link")?.remove();
      } else image.remove();
    }
    image.addEventListener("error", fallback, { once: true });
    if (image.complete && image.naturalWidth === 0) fallback();
  });
})();
