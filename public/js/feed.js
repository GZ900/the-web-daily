"use strict";

const feed =
  document.querySelector("#news-feed");

const searchInput =
  document.querySelector("#feed-search");

const categorySelect =
  document.querySelector("#feed-category");

const viewedSelect =
  document.querySelector("#feed-viewed");

const sortSelect =
  document.querySelector("#feed-sort");

const feedMessage =
  document.querySelector("#feed-message");

const sentinel =
  document.querySelector("#feed-sentinel");

if (
  feed &&
  searchInput &&
  categorySelect &&
  viewedSelect &&
  sortSelect &&
  sentinel
) {
  let currentPage = 2;
  let loading = false;

  let hasMore =
    feed.querySelectorAll(".news-card").length >= 20;

  let searchTimer = null;

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
        JSON.parse(value);

      return Array.isArray(parsed)
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
      params.get("search") || "";

    const category =
      params.get("category") || "";

    const viewed =
      params.get("viewed") || "all";

    const sort =
      params.get("sort") || "newest";

    searchInput.value = search;

    const categoryExists =
      Array.from(
        categorySelect.options
      ).some(
        option =>
          option.value === category
      );

    if (categoryExists) {
      categorySelect.value =
        category;
    }

    if (
      ["all", "viewed", "unviewed"]
        .includes(viewed)
    ) {
      viewedSelect.value =
        viewed;
    }

    if (
      ["newest", "popular"]
        .includes(sort)
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
      searchInput.value.trim();

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

    if (viewed !== "all") {
      params.set(
        "viewed",
        viewed
      );
    }

    if (sort !== "newest") {
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
      newUrl
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
      searchInput.value.trim()
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

    if (viewedIds.length > 0) {
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
      "news-card";

    card.dataset.articleId =
      article.id;

    if (article.imageUrl) {
      const image =
        document.createElement(
          "img"
        );

      image.src =
        article.imageUrl;

      image.alt =
        article.title;

      image.loading =
        "lazy";

      card.append(image);
    }

    const category =
      document.createElement(
        "p"
      );

    const strong =
      document.createElement(
        "strong"
      );

    strong.textContent =
      article.category;

    category.append(strong);

    const heading =
      document.createElement(
        "h3"
      );

    const link =
      document.createElement(
        "a"
      );

    link.href =
      `/articles/${article.id}`;

    link.textContent =
      article.title;

    heading.append(link);

    const summary =
      document.createElement(
        "p"
      );

    summary.textContent =
      article.summary;

    const author =
      document.createElement(
        "p"
      );

    author.textContent =
      `By ${article.author}`;

    const date =
      document.createElement(
        "p"
      );

    date.textContent =
      new Date(
        article.publishedAt
      ).toLocaleString();

    card.append(
      category,
      heading,
      summary,
      author,
      date
    );

    return card;
  }

  async function loadPage({
    reset = false
  } = {}) {
    if (loading) {
      return;
    }

    if (!hasMore && !reset) {
      return;
    }

    loading = true;

    if (reset) {
      currentPage = 1;
      hasMore = true;
      feed.innerHTML = "";
    }

    feedMessage.textContent =
      "Loading...";

    try {
      const response =
        await fetch(
          buildUrl(currentPage)
        );

      const data =
        await response.json();

      if (!response.ok) {
        feedMessage.textContent =
          data.message ||
          "Unable to load articles";

        return;
      }

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
      } else {
        feedMessage.textContent =
          "";
      }

      currentPage += 1;
    } catch (error) {
      console.error(
        "Feed request error:",
        error
      );

      feedMessage.textContent =
        "Unable to connect to the server";
    } finally {
      loading = false;
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
        rootMargin: "300px"
      }
    );

  observer.observe(
    sentinel
  );
}