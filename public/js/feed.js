"use strict";

const feed =
  document.querySelector(
    "#news-feed"
  );

const searchInput =
  document.querySelector(
    "#feed-search"
  );

const categorySelect =
  document.querySelector(
    "#feed-category"
  );

const viewedSelect =
  document.querySelector(
    "#feed-viewed"
  );

const sortSelect =
  document.querySelector(
    "#feed-sort"
  );

const feedMessage =
  document.querySelector(
    "#feed-message"
  );

const sentinel =
  document.querySelector(
    "#feed-sentinel"
  );

if (
  feed &&
  searchInput &&
  categorySelect &&
  viewedSelect &&
  sortSelect &&
  sentinel
) {
  let currentPage = 2;

  let loading =
    false;

  let hasMore =
    feed.querySelectorAll(
      ".news-card"
    ).length >= 20;

  let activeRequest = null;

  let searchTimer =
    null;

  const dateFormatter =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",

        hour12:
          false
      }
    );

  function getViewedArticles() {
    try {
      const value =
        localStorage.getItem(
          "webDailyViewedArticles"
        );

      if (!value) {
        return [];
      }

      const parsed =
        JSON.parse(
          value
        );

      return Array.isArray(
        parsed
      )
        ? parsed
        : [];
    } catch (error) {
      return [];
    }
  }

  function restoreControlsFromUrl() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const search =
      params.get(
        "search"
      ) || "";

    const category =
      params.get(
        "category"
      ) || "";

    const viewed =
      params.get(
        "viewed"
      ) || "all";

    const sort =
      params.get(
        "sort"
      ) || "newest";

    searchInput.value =
      search;

    const categoryExists =
      Array.from(
        categorySelect.options
      ).some(
        option =>
          option.value ===
          category
      );

    if (
      categoryExists
    ) {
      categorySelect.value =
        category;
    }

    if (
      [
        "all",
        "viewed",
        "unviewed"
      ].includes(
        viewed
      )
    ) {
      viewedSelect.value =
        viewed;
    }

    if (
      [
        "newest",
        "popular"
      ].includes(
        sort
      )
    ) {
      sortSelect.value =
        sort;
    }

    return (
      search !== "" ||
      category !== "" ||
      viewed !== "all" ||
      sort !== "newest"
    );
  }

  function syncControlsToUrl() {
    const params =
      new URLSearchParams();

    const search =
      searchInput.value
        .trim();

    const category =
      categorySelect.value;

    const viewed =
      viewedSelect.value;

    const sort =
      sortSelect.value;

    if (search) {
      params.set(
        "search",
        search
      );
    }

    if (category) {
      params.set(
        "category",
        category
      );
    }

    if (
      viewed !== "all"
    ) {
      params.set(
        "viewed",
        viewed
      );
    }

    if (
      sort !== "newest"
    ) {
      params.set(
        "sort",
        sort
      );
    }

    const query =
      params.toString();

    const newUrl =
      query
        ? `${window.location.pathname}?${query}`
        : window.location.pathname;

    window.history.replaceState(
      null,
      "",
      newUrl + window.location.hash
    );
  }

  function buildUrl(page) {
    const params =
      new URLSearchParams();

    params.set(
      "page",
      String(page)
    );

    params.set(
      "search",
      searchInput.value
        .trim()
    );

    params.set(
      "category",
      categorySelect.value
    );

    params.set(
      "viewed",
      viewedSelect.value
    );

    params.set(
      "sort",
      sortSelect.value
    );

    const viewedIds =
      getViewedArticles();

    if (
      viewedIds.length > 0
    ) {
      params.set(
        "viewedIds",
        viewedIds.join(",")
      );
    }

    return (
      "/api/articles?" +
      params.toString()
    );
  }

  function createArticleCard(
    article
  ) {
    const card =
      document.createElement(
        "article"
      );

    card.className =
      article.imageUrl
        ? "news-card"
        : "news-card news-card--no-image";

    card.dataset.articleId =
      article.id;

    if (article.imageUrl) {
      const imageLink =
        document.createElement(
          "a"
        );

      imageLink.className =
        "news-card-image-link";

      imageLink.href =
        `/articles/${article.id}`;

      imageLink.tabIndex =
        -1;

      imageLink.setAttribute(
        "aria-hidden",
        "true"
      );

      const image =
        document.createElement(
          "img"
        );

      image.className =
        "news-card-image";

      image.src =
        article.imageUrl;

      image.alt =
        article.title;

      image.loading =
        "lazy";

      image.addEventListener(
        "error",
        function () {
          imageLink.remove();

          card.classList.add(
            "news-card--no-image"
          );
        }
      );

      imageLink.append(
        image
      );

      card.append(
        imageLink
      );
    }

    const content =
      document.createElement(
        "div"
      );

    content.className =
      "news-card-content";

    const topline =
      document.createElement(
        "div"
      );

    topline.className =
      "news-card-topline";

    const category =
      document.createElement(
        "span"
      );

    category.className =
      "news-category";

    category.textContent =
      article.category;

    const views =
      document.createElement(
        "span"
      );

    views.className =
      "news-views";

    views.textContent =
      `${article.totalViews || 0} views`;

    topline.append(
      category,
      views
    );

    const heading =
      document.createElement(
        "h3"
      );

    heading.className =
      "news-card-title";

    const link =
      document.createElement(
        "a"
      );

    link.href =
      `/articles/${article.id}`;

    link.textContent =
      article.title;

    heading.append(
      link
    );

    const summary =
      document.createElement(
        "p"
      );

    summary.className =
      "news-card-summary";

    summary.textContent =
      article.summary;

    const footer =
      document.createElement(
        "footer"
      );

    footer.className =
      "news-card-footer";

    const author =
      document.createElement(
        "span"
      );

    author.className =
      "news-author";

    author.append(
      document.createTextNode(
        "By "
      )
    );

    const authorName =
      document.createElement(
        "strong"
      );

    authorName.textContent =
      article.author ||
      "Unknown";

    author.append(
      authorName
    );

    const time =
      document.createElement(
        "time"
      );

    const publishedDate =
      new Date(
        article.publishedAt
      );

    if (
      !Number.isNaN(
        publishedDate.getTime()
      )
    ) {
      time.dateTime =
        publishedDate.toISOString();

      time.textContent =
        dateFormatter.format(
          publishedDate
        );
    }

    footer.append(
      author,
      time
    );

    content.append(
      topline,
      heading,
      summary,
      footer
    );

    card.append(
      content
    );

    return card;
  }

  async function loadPage({
    reset = false
  } = {}) {
    if (loading && !reset) {
      return;
    }

    if (
      !hasMore &&
      !reset
    ) {
      return;
    }

    if (reset) activeRequest?.abort();
    const request = new AbortController();
    activeRequest = request;

    loading =
      true;
    feed.setAttribute("aria-busy", "true");

    if (reset) {
      currentPage =
        1;

      hasMore =
        true;
    }

    feedMessage.textContent =
      "Loading...";

    try {
      const response =
        await fetch(
          buildUrl(
            currentPage
          ),
          { signal: request.signal }
        );

      const data =
        await response.json();

      if (request !== activeRequest) return;

      if (!response.ok) {
        feedMessage.textContent =
          data.message ||
          "Unable to load articles";

        return;
      }

      if (reset) feed.replaceChildren();

      data.articles.forEach(
        article => {
          feed.append(
            createArticleCard(
              article
            )
          );
        }
      );

      hasMore =
        data.hasMore;

      if (
        currentPage === 1 &&
        data.articles.length === 0
      ) {
        feedMessage.textContent =
          "No articles found.";
      } else if (!hasMore) {
        feedMessage.textContent =
          "";
      } else {
        feedMessage.textContent =
          "";
      }

      currentPage +=
        1;

      document.dispatchEvent(new CustomEvent("feed:updated", { detail: { reset } }));
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error(
        "Feed request error:",
        error
      );

      feedMessage.textContent =
        "Unable to connect to the server";
    } finally {
      if (request === activeRequest) {
        loading = false;
        feed.setAttribute("aria-busy", "false");
      }
    }
  }

  function resetFeed() {
    syncControlsToUrl();

    loadPage({
      reset: true
    });
  }

  searchInput.addEventListener(
    "input",
    function () {
      clearTimeout(
        searchTimer
      );

      searchTimer =
        setTimeout(
          resetFeed,
          350
        );
    }
  );

  categorySelect.addEventListener(
    "change",
    resetFeed
  );

  viewedSelect.addEventListener(
    "change",
    resetFeed
  );

  sortSelect.addEventListener(
    "change",
    resetFeed
  );

  const hadSavedState =
    restoreControlsFromUrl();

  if (hadSavedState) {
    loadPage({
      reset: true
    });
  }

  const observer =
    new IntersectionObserver(
      entries => {
        const entry =
          entries[0];

        if (
          entry.isIntersecting &&
          hasMore
        ) {
          loadPage();
        }
      },
      {
        rootMargin:
          "300px"
      }
    );

  observer.observe(
    sentinel
  );
}