"use strict";

const articleSearch =
  document.querySelector(
    "#analytics-article-search"
  );

const searchMessage =
  document.querySelector(
    "#analytics-search-message"
  );

const reporterSelect =
  document.querySelector(
    "#analytics-reporter"
  );

const reporterButton =
  document.querySelector(
    "#analytics-reporter-button"
  );

const reporterValue =
  document.querySelector(
    "#analytics-reporter-value"
  );

const reporterMenu =
  document.querySelector(
    "#analytics-reporter-menu"
  );

const reporterCustomSelect =
  document.querySelector(
    "#reporter-custom-select"
  );

const articleSelect =
  document.querySelector(
    "#analytics-article"
  );

const articleButton =
  document.querySelector(
    "#analytics-article-button"
  );

const articleValue =
  document.querySelector(
    "#analytics-article-value"
  );

const articleMenu =
  document.querySelector(
    "#analytics-article-menu"
  );

const articleCustomSelect =
  document.querySelector(
    "#article-custom-select"
  );

const rangeSelect =
  document.querySelector(
    "#analytics-range"
  );

const customControls =
  document.querySelector(
    "#custom-range-controls"
  );

const startInput =
  document.querySelector(
    "#analytics-start"
  );

const endInput =
  document.querySelector(
    "#analytics-end"
  );

const applyCustomButton =
  document.querySelector(
    "#apply-custom-range"
  );

const chartCanvas =
  document.querySelector(
    "#analytics-chart"
  );

const titleElement =
  document.querySelector(
    "#analytics-title"
  );

const totalViewsElement =
  document.querySelector(
    "#analytics-total-views"
  );

const messageElement =
  document.querySelector(
    "#analytics-message"
  );

const publicationEvents =
  document.querySelector(
    "#publication-events"
  );

const VALID_RANGES = [
  "30m",
  "1h",
  "3h",
  "6h",
  "12h",
  "24h",
  "7d",
  "30d",
  "90d",
  "custom"
];

let analyticsChart = null;

let allArticles = [];

let allReporters = [];

function formatDateTime(
  dateValue
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  ).format(
    new Date(
      dateValue
    )
  );
}

function formatChartTime(
  dateValue,
  bucketMinutes
) {
  const date =
    new Date(
      dateValue
    );

  if (
    bucketMinutes <= 15
  ) {
    return new Intl.DateTimeFormat(
      "en-GB",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }
    ).format(
      date
    );
  }

  if (
    bucketMinutes <= 60
  ) {
    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }
    ).format(
      date
    );
  }

  if (
    bucketMinutes < 1440
  ) {
    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        hour12: false
      }
    ).format(
      date
    );
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  ).format(
    date
  );
}

function toDateTimeLocalValue(
  date
) {
  const pad =
    value =>
      String(
        value
      ).padStart(
        2,
        "0"
      );

  return (
    `${date.getFullYear()}-` +
    `${pad(
      date.getMonth() + 1
    )}-` +
    `${pad(
      date.getDate()
    )}T` +
    `${pad(
      date.getHours()
    )}:` +
    `${pad(
      date.getMinutes()
    )}`
  );
}

function initialiseCustomRange() {
  const end =
    new Date();

  const start =
    new Date(
      end.getTime() -
      6 *
      60 *
      60 *
      1000
    );

  startInput.value =
    toDateTimeLocalValue(
      start
    );

  endInput.value =
    toDateTimeLocalValue(
      end
    );
}

function restoreCustomRange(
  params
) {
  const startValue =
    params.get(
      "start"
    );

  const endValue =
    params.get(
      "end"
    );

  if (
    !startValue ||
    !endValue
  ) {
    return false;
  }

  const start =
    new Date(
      startValue
    );

  const end =
    new Date(
      endValue
    );

  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    )
  ) {
    return false;
  }

  startInput.value =
    toDateTimeLocalValue(
      start
    );

  endInput.value =
    toDateTimeLocalValue(
      end
    );

  return true;
}

function collectArticles() {
  allArticles =
    Array.from(
      articleSelect.options
    ).map(
      option => ({
        id:
          option.value,

        title:
          option.dataset.title ||
          option.textContent,

        reporterId:
          option.dataset.reporterId ||
          "",

        reporterName:
          option.dataset.reporterName ||
          "Unknown",

        label:
          option.textContent
            .replace(
              /\s+/g,
              " "
            )
            .trim()
      })
    );

  const reporterMap =
    new Map();

  allArticles.forEach(
    article => {
      if (
        !article.reporterId
      ) {
        return;
      }

      if (
        !reporterMap.has(
          article.reporterId
        )
      ) {
        reporterMap.set(
          article.reporterId,
          article.reporterName
        );
      }
    }
  );

  allReporters =
    Array.from(
      reporterMap.entries()
    )
      .map(
        (
          [
            id,
            name
          ]
        ) => ({
          id,
          name
        })
      )
      .sort(
        (
          first,
          second
        ) =>
          first.name.localeCompare(
            second.name,
            "en"
          )
      );
}

function closeCustomMenus() {
  reporterMenu.hidden =
    true;

  articleMenu.hidden =
    true;

  reporterCustomSelect
    .classList.remove(
      "is-open"
    );

  articleCustomSelect
    .classList.remove(
      "is-open"
    );

  reporterButton.setAttribute(
    "aria-expanded",
    "false"
  );

  articleButton.setAttribute(
    "aria-expanded",
    "false"
  );
}

function toggleCustomMenu(
  type
) {
  const reporterOpen =
    !reporterMenu.hidden;

  const articleOpen =
    !articleMenu.hidden;

  closeCustomMenus();

  if (
    type === "reporter" &&
    !reporterOpen
  ) {
    reporterMenu.hidden =
      false;

    reporterCustomSelect
      .classList.add(
        "is-open"
      );

    reporterButton.setAttribute(
      "aria-expanded",
      "true"
    );
  }

  if (
    type === "article" &&
    !articleOpen &&
    !articleButton.disabled
  ) {
    articleMenu.hidden =
      false;

    articleCustomSelect
      .classList.add(
        "is-open"
      );

    articleButton.setAttribute(
      "aria-expanded",
      "true"
    );
  }
}

function createMenuOption(
  {
    value,
    label,
    selected,
    onSelect
  }
) {
  const button =
    document.createElement(
      "button"
    );

  button.type =
    "button";

  button.className =
    "analytics-select-option";

  button.setAttribute(
    "role",
    "option"
  );

  button.dataset.value =
    value;

  button.textContent =
    label;

  if (selected) {
    button.classList.add(
      "is-selected"
    );

    button.setAttribute(
      "aria-selected",
      "true"
    );
  } else {
    button.setAttribute(
      "aria-selected",
      "false"
    );
  }

  button.addEventListener(
    "click",
    onSelect
  );

  return button;
}

function renderReporterMenu() {
  reporterMenu.innerHTML =
    "";

  reporterSelect.innerHTML =
    "";

  const allOption =
    document.createElement(
      "option"
    );

  allOption.value = "";

  allOption.textContent =
    "All Reporters";

  reporterSelect.append(
    allOption
  );

  reporterMenu.append(
    createMenuOption({
      value: "",
      label: "All Reporters",
      selected:
        reporterSelect.value === "",
      onSelect() {
        reporterSelect.value =
          "";

        reporterValue.textContent =
          "All Reporters";

        closeCustomMenus();

        applyArticleFilters(
          articleSelect.value
        );

        loadAnalytics();
      }
    })
  );

  allReporters.forEach(
    reporter => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        reporter.id;

      option.textContent =
        reporter.name;

      reporterSelect.append(
        option
      );
    }
  );
}

function refreshReporterMenu() {
  const currentValue =
    reporterSelect.value;

  reporterMenu.innerHTML =
    "";

  const reporterOptions = [
    {
      id: "",
      name:
        "All Reporters"
    },
    ...allReporters
  ];

  reporterOptions.forEach(
    reporter => {
      reporterMenu.append(
        createMenuOption({
          value:
            reporter.id,

          label:
            reporter.name,

          selected:
            reporter.id ===
            currentValue,

          onSelect() {
            reporterSelect.value =
              reporter.id;

            reporterValue.textContent =
              reporter.name;

            closeCustomMenus();

            applyArticleFilters(
              articleSelect.value
            );

            refreshReporterMenu();

            loadAnalytics();
          }
        })
      );
    }
  );
}

function populateReporterOptions() {
  reporterSelect.innerHTML =
    "";

  const allOption =
    document.createElement(
      "option"
    );

  allOption.value = "";

  allOption.textContent =
    "All Reporters";

  reporterSelect.append(
    allOption
  );

  allReporters.forEach(
    reporter => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        reporter.id;

      option.textContent =
        reporter.name;

      reporterSelect.append(
        option
      );
    }
  );

  refreshReporterMenu();
}

function createArticleOption(
  article
) {
  const option =
    document.createElement(
      "option"
    );

  option.value =
    article.id;

  option.dataset.title =
    article.title;

  option.dataset.reporterId =
    article.reporterId;

  option.dataset.reporterName =
    article.reporterName;

  option.textContent =
    article.label;

  return option;
}

function renderArticleMenu(
  articles
) {
  articleMenu.innerHTML =
    "";

  if (
    articles.length === 0
  ) {
    articleValue.textContent =
      "No matching articles";

    articleButton.disabled =
      true;

    return;
  }

  articleButton.disabled =
    false;

  articles.forEach(
    article => {
      articleMenu.append(
        createMenuOption({
          value:
            article.id,

          label:
            article.label,

          selected:
            article.id ===
            articleSelect.value,

          onSelect() {
            articleSelect.value =
              article.id;

            articleValue.textContent =
              article.label;

            closeCustomMenus();

            renderArticleMenu(
              articles
            );

            loadAnalytics();
          }
        })
      );
    }
  );
}

function renderArticleOptions(
  articles,
  preferredArticleId
) {
  articleSelect.innerHTML =
    "";

  if (
    articles.length === 0
  ) {
    renderArticleMenu(
      articles
    );

    return "";
  }

  const preferredExists =
    articles.some(
      article =>
        article.id ===
        preferredArticleId
    );

  const selectedArticleId =
    preferredExists
      ? preferredArticleId
      : articles[0].id;

  articles.forEach(
    article => {
      const option =
        createArticleOption(
          article
        );

      if (
        article.id ===
        selectedArticleId
      ) {
        option.selected =
          true;
      }

      articleSelect.append(
        option
      );
    }
  );

  const selectedArticle =
    articles.find(
      article =>
        article.id ===
        selectedArticleId
    );

  articleValue.textContent =
    selectedArticle
      ? selectedArticle.label
      : "Choose an article";

  renderArticleMenu(
    articles
  );

  return selectedArticleId;
}

function getSelectedReporterName() {
  if (
    !reporterSelect.value
  ) {
    return "";
  }

  const reporter =
    allReporters.find(
      item =>
        item.id ===
        reporterSelect.value
    );

  return reporter
    ? reporter.name
    : "";
}

function getFilteredArticles() {
  const query =
    String(
      articleSearch.value ||
      ""
    )
      .trim()
      .toLowerCase();

  const reporterId =
    reporterSelect.value;

  return allArticles.filter(
    article => {
      const matchesReporter =
        !reporterId ||
        article.reporterId ===
          reporterId;

      const matchesSearch =
        !query ||
        article.title
          .toLowerCase()
          .includes(
            query
          );

      return (
        matchesReporter &&
        matchesSearch
      );
    }
  );
}

function updateSearchMessage(
  filteredArticles
) {
  const query =
    String(
      articleSearch.value ||
      ""
    ).trim();

  const reporterName =
    getSelectedReporterName();

  const count =
    filteredArticles.length;

  if (count === 0) {
    if (
      query &&
      reporterName
    ) {
      searchMessage.textContent =
        `No articles by ${reporterName} match your search.`;

      return;
    }

    if (reporterName) {
      searchMessage.textContent =
        `No published articles are available for ${reporterName}.`;

      return;
    }

    searchMessage.textContent =
      "No articles match your search.";

    return;
  }

  if (
    query &&
    reporterName
  ) {
    searchMessage.textContent =
      `${count} matching article` +
      (
        count === 1
          ? ""
          : "s"
      ) +
      ` by ${reporterName}.`;

    return;
  }

  if (query) {
    searchMessage.textContent =
      `${count} matching article` +
      (
        count === 1
          ? ""
          : "s"
      ) +
      ".";

    return;
  }

  if (reporterName) {
    searchMessage.textContent =
      `${count} published article` +
      (
        count === 1
          ? ""
          : "s"
      ) +
      ` by ${reporterName}.`;

    return;
  }

  searchMessage.textContent =
    `${count} published article` +
    (
      count === 1
        ? ""
        : "s"
    ) +
    " available.";
}

function filterArticles(
  preferredArticleId
) {
  const filteredArticles =
    getFilteredArticles();

  const selectedArticleId =
    renderArticleOptions(
      filteredArticles,
      preferredArticleId
    );

  updateSearchMessage(
    filteredArticles
  );

  return selectedArticleId;
}

function getCurrentUrlParams() {
  return new URLSearchParams(
    window.location.search
  );
}

function updatePageUrl() {
  const params =
    new URLSearchParams();

  if (
    articleSelect.value
  ) {
    params.set(
      "article",
      articleSelect.value
    );
  }

  if (
    reporterSelect.value
  ) {
    params.set(
      "reporter",
      reporterSelect.value
    );
  }

  const search =
    String(
      articleSearch.value ||
      ""
    ).trim();

  if (search) {
    params.set(
      "search",
      search
    );
  }

  params.set(
    "range",
    rangeSelect.value
  );

  if (
    rangeSelect.value ===
    "custom" &&
    startInput.value &&
    endInput.value
  ) {
    const start =
      new Date(
        startInput.value
      );

    const end =
      new Date(
        endInput.value
      );

    if (
      !Number.isNaN(
        start.getTime()
      ) &&
      !Number.isNaN(
        end.getTime()
      )
    ) {
      params.set(
        "start",
        start.toISOString()
      );

      params.set(
        "end",
        end.toISOString()
      );
    }
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

function restorePageState() {
  const params =
    getCurrentUrlParams();

  const requestedReporter =
    params.get(
      "reporter"
    );

  if (
    requestedReporter &&
    allReporters.some(
      reporter =>
        reporter.id ===
        requestedReporter
    )
  ) {
    reporterSelect.value =
      requestedReporter;

    const reporter =
      allReporters.find(
        item =>
          item.id ===
          requestedReporter
      );

    reporterValue.textContent =
      reporter
        ? reporter.name
        : "All Reporters";
  } else {
    reporterValue.textContent =
      "All Reporters";
  }

  const requestedSearch =
    params.get(
      "search"
    );

  if (requestedSearch) {
    articleSearch.value =
      requestedSearch;
  }

  const requestedRange =
    params.get(
      "range"
    );

  if (
    requestedRange &&
    VALID_RANGES.includes(
      requestedRange
    )
  ) {
    rangeSelect.value =
      requestedRange;
  }

  if (
    rangeSelect.value ===
    "custom"
  ) {
    const restored =
      restoreCustomRange(
        params
      );

    if (!restored) {
      initialiseCustomRange();
    }
  }

  const requestedArticle =
    params.get(
      "article"
    );

  if (
    requestedArticle &&
    allArticles.some(
      article =>
        article.id ===
        requestedArticle
    )
  ) {
    return requestedArticle;
  }

  return "";
}

/*
    CHART THEME
*/

function getChartTheme() {
  const dark =
    document.documentElement
      .dataset.theme ===
      "dark";

  if (dark) {
    return {
      text:
        "#a1a1a6",

      title:
        "#f5f5f7",

      grid:
        "rgba(255,255,255,0.10)",

      line:
        "#64d2ff",

      point:
        "#64d2ff",

      tooltipBackground:
        "#2c2c2e",

      tooltipTitle:
        "#ffffff",

      tooltipBody:
        "#d1d1d6",

      tooltipBorder:
        "rgba(255,255,255,0.14)",

      marker:
        "#ff453a"
    };
  }

  return {
    text:
      "#6e6e73",

    title:
      "#1d1d1f",

    grid:
      "rgba(0,0,0,0.09)",

    line:
      "#2997ff",

    point:
      "#2997ff",

    tooltipBackground:
      "#1d1d1f",

    tooltipTitle:
      "#ffffff",

    tooltipBody:
      "#e5e5ea",

    tooltipBorder:
      "rgba(0,0,0,0.12)",

    marker:
      "#c0392b"
  };
}

const publicationMarkerPlugin = {
  id:
    "publicationMarkers",

  afterDatasetsDraw(
    chart,
    args,
    options
  ) {
    const markers =
      options.markers || [];

    if (
      markers.length === 0
    ) {
      return;
    }

    const theme =
      getChartTheme();

    const {
      ctx,
      chartArea,
      scales
    } = chart;

    markers.forEach(
      (
        marker,
        markerIndex
      ) => {
        const x =
          scales.x
            .getPixelForValue(
              marker.pointIndex
            );

        if (
          x <
            chartArea.left ||
          x >
            chartArea.right
        ) {
          return;
        }

        ctx.save();

        ctx.beginPath();

        ctx.setLineDash(
          [6, 5]
        );

        ctx.lineWidth =
          2;

        ctx.strokeStyle =
          theme.marker;

        ctx.moveTo(
          x,
          chartArea.top
        );

        ctx.lineTo(
          x,
          chartArea.bottom
        );

        ctx.stroke();

        ctx.setLineDash(
          []
        );

        ctx.beginPath();

        ctx.fillStyle =
          theme.marker;

        ctx.arc(
          x,
          chartArea.top + 13,
          10,
          0,
          Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle =
          "#ffffff";

        ctx.font =
          "bold 11px sans-serif";

        ctx.textAlign =
          "center";

        ctx.textBaseline =
          "middle";

        ctx.fillText(
          String(
            markerIndex + 1
          ),
          x,
          chartArea.top + 13
        );

        ctx.restore();
      }
    );
  }
};

if (
  typeof Chart !==
  "undefined"
) {
  Chart.register(
    publicationMarkerPlugin
  );
}

function findNearestPointIndex(
  points,
  publicationTime
) {
  if (
    points.length === 0
  ) {
    return 0;
  }

  const target =
    new Date(
      publicationTime
    ).getTime();

  let nearestIndex =
    0;

  let smallestDifference =
    Infinity;

  points.forEach(
    (
      point,
      index
    ) => {
      const difference =
        Math.abs(
          new Date(
            point.time
          ).getTime() -
          target
        );

      if (
        difference <
        smallestDifference
      ) {
        smallestDifference =
          difference;

        nearestIndex =
          index;
      }
    }
  );

  return nearestIndex;
}

function renderPublicationEvents(
  publications
) {
  publicationEvents.innerHTML =
    "";

  if (
    publications.length === 0
  ) {
    publicationEvents.textContent =
      "No publication events in this time range.";

    return;
  }

  publications.forEach(
    (
      publication,
      index
    ) => {
      const paragraph =
        document.createElement(
          "p"
        );

      const strong =
        document.createElement(
          "strong"
        );

      strong.textContent =
        `Marker ${index + 1}: `;

      const text =
        document.createTextNode(
          `${publication.label} — ` +
          formatDateTime(
            publication.time
          )
        );

      paragraph.append(
        strong,
        text
      );

      publicationEvents.append(
        paragraph
      );
    }
  );
}

function applyChartTheme(
  chart
) {
  if (!chart) {
    return;
  }

  const theme =
    getChartTheme();

  const dataset =
    chart.data.datasets[0];

  dataset.borderColor =
    theme.line;

  dataset.backgroundColor =
    theme.line;

  dataset.pointBackgroundColor =
    theme.point;

  dataset.pointBorderColor =
    theme.point;

  chart.options.plugins.legend.labels.color =
    theme.text;

  chart.options.plugins.tooltip.backgroundColor =
    theme.tooltipBackground;

  chart.options.plugins.tooltip.titleColor =
    theme.tooltipTitle;

  chart.options.plugins.tooltip.bodyColor =
    theme.tooltipBody;

  chart.options.plugins.tooltip.borderColor =
    theme.tooltipBorder;

  chart.options.plugins.tooltip.borderWidth =
    1;

  chart.options.scales.x.ticks.color =
    theme.text;

  chart.options.scales.x.grid.color =
    theme.grid;

  chart.options.scales.x.title.color =
    theme.text;

  chart.options.scales.y.ticks.color =
    theme.text;

  chart.options.scales.y.grid.color =
    theme.grid;

  chart.options.scales.y.title.color =
    theme.text;

  chart.update(
    "none"
  );
}

function createChart(data) {
  if (
    typeof Chart ===
    "undefined"
  ) {
    messageElement.textContent =
      "Chart library could not be loaded.";

    return;
  }

  if (analyticsChart) {
    analyticsChart.destroy();
  }

  const theme =
    getChartTheme();

  const labels =
    data.points.map(
      point =>
        formatChartTime(
          point.time,
          data.bucketMinutes
        )
    );

  const views =
    data.points.map(
      point =>
        point.views
    );

  const markers =
    data.publications.map(
      publication => ({
        ...publication,

        pointIndex:
          findNearestPointIndex(
            data.points,
            publication.time
          )
      })
    );

  analyticsChart =
    new Chart(
      chartCanvas,
      {
        type:
          "line",

        data: {
          labels,

          datasets: [
            {
              label:
                "Views",

              data:
                views,

              borderColor:
                theme.line,

              backgroundColor:
                theme.line,

              pointBackgroundColor:
                theme.point,

              pointBorderColor:
                theme.point,

              borderWidth:
                2,

              pointRadius:
                data.points.length >
                180
                  ? 0
                  : 2,

              pointHoverRadius:
                5,

              tension:
                0.18,

              fill:
                false
            }
          ]
        },

        options: {
          responsive:
            true,

          maintainAspectRatio:
            false,

          interaction: {
            mode:
              "index",

            intersect:
              false
          },

          plugins: {
            publicationMarkers: {
              markers
            },

            legend: {
              display:
                true,

              labels: {
                color:
                  theme.text
              }
            },

            tooltip: {
              backgroundColor:
                theme.tooltipBackground,

              titleColor:
                theme.tooltipTitle,

              bodyColor:
                theme.tooltipBody,

              borderColor:
                theme.tooltipBorder,

              borderWidth:
                1,

              callbacks: {
                title(
                  tooltipItems
                ) {
                  const index =
                    tooltipItems[0]
                      .dataIndex;

                  return formatDateTime(
                    data.points[
                      index
                    ].time
                  );
                }
              }
            }
          },

          scales: {
            x: {
              grid: {
                color:
                  theme.grid
              },

              ticks: {
                color:
                  theme.text,

                maxTicksLimit:
                  14
              },

              title: {
                display:
                  true,

                color:
                  theme.text,

                text:
                  "Time"
              }
            },

            y: {
              beginAtZero:
                true,

              grid: {
                color:
                  theme.grid
              },

              ticks: {
                color:
                  theme.text,

                precision:
                  0
              },

              title: {
                display:
                  true,

                color:
                  theme.text,

                text:
                  "Views"
              }
            }
          }
        }
      }
    );
}

function getAnalyticsUrl() {
  const articleId =
    articleSelect.value;

  if (!articleId) {
    return null;
  }

  const range =
    rangeSelect.value;

  const params =
    new URLSearchParams();

  params.set(
    "range",
    range
  );

  if (
    range === "custom"
  ) {
    if (
      !startInput.value ||
      !endInput.value
    ) {
      return null;
    }

    const start =
      new Date(
        startInput.value
      );

    const end =
      new Date(
        endInput.value
      );

    if (
      Number.isNaN(
        start.getTime()
      ) ||
      Number.isNaN(
        end.getTime()
      )
    ) {
      return null;
    }

    params.set(
      "start",
      start.toISOString()
    );

    params.set(
      "end",
      end.toISOString()
    );
  }

  return (
    `/api/editor/articles/` +
    `${articleId}/analytics?` +
    params.toString()
  );
}

function updatePageUrl() {
  const params =
    new URLSearchParams();

  if (
    articleSelect.value
  ) {
    params.set(
      "article",
      articleSelect.value
    );
  }

  if (
    reporterSelect.value
  ) {
    params.set(
      "reporter",
      reporterSelect.value
    );
  }

  const search =
    String(
      articleSearch.value ||
      ""
    ).trim();

  if (search) {
    params.set(
      "search",
      search
    );
  }

  params.set(
    "range",
    rangeSelect.value
  );

  if (
    rangeSelect.value ===
    "custom" &&
    startInput.value &&
    endInput.value
  ) {
    const start =
      new Date(
        startInput.value
      );

    const end =
      new Date(
        endInput.value
      );

    if (
      !Number.isNaN(
        start.getTime()
      ) &&
      !Number.isNaN(
        end.getTime()
      )
    ) {
      params.set(
        "start",
        start.toISOString()
      );

      params.set(
        "end",
        end.toISOString()
      );
    }
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

function restorePageState() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const requestedReporter =
    params.get(
      "reporter"
    );

  if (
    requestedReporter &&
    allReporters.some(
      reporter =>
        reporter.id ===
        requestedReporter
    )
  ) {
    reporterSelect.value =
      requestedReporter;

    const reporter =
      allReporters.find(
        item =>
          item.id ===
          requestedReporter
      );

    reporterValue.textContent =
      reporter
        ? reporter.name
        : "All Reporters";
  } else {
    reporterValue.textContent =
      "All Reporters";
  }

  const requestedSearch =
    params.get(
      "search"
    );

  if (requestedSearch) {
    articleSearch.value =
      requestedSearch;
  }

  const requestedRange =
    params.get(
      "range"
    );

  if (
    requestedRange &&
    VALID_RANGES.includes(
      requestedRange
    )
  ) {
    rangeSelect.value =
      requestedRange;
  }

  if (
    rangeSelect.value ===
    "custom"
  ) {
    const restored =
      restoreCustomRange(
        params
      );

    if (!restored) {
      initialiseCustomRange();
    }
  }

  return (
    params.get(
      "article"
    ) || ""
  );
}

async function loadAnalytics() {
  if (
    !articleSelect.value
  ) {
    titleElement.textContent =
      "No article selected";

    totalViewsElement.textContent =
      "-";

    messageElement.textContent =
      "No article is available for the current filters.";

    if (analyticsChart) {
      analyticsChart.destroy();

      analyticsChart =
        null;
    }

    publicationEvents.innerHTML =
      "";

    updatePageUrl();

    return;
  }

  const url =
    getAnalyticsUrl();

  if (!url) {
    messageElement.textContent =
      "Choose a valid start and end time.";

    return;
  }

  updatePageUrl();

  messageElement.textContent =
    "Loading...";

  try {
    const response =
      await fetch(
        url
      );

    const data =
      await response.json();

    if (!response.ok) {
      messageElement.textContent =
        data.message ||
        "Unable to load analytics";

      return;
    }

    titleElement.textContent =
      data.article.title;

    totalViewsElement.textContent =
      data.article.totalViews;

    messageElement.textContent =
      "";

    createChart(
      data
    );

    renderPublicationEvents(
      data.publications
    );
  } catch (error) {
    console.error(
      "Analytics request error:",
      error
    );

    messageElement.textContent =
      "Unable to connect to the server";
  }
}

function updateSearchMessage(
  filteredArticles
) {
  const query =
    articleSearch.value
      .trim();

  const reporter =
    allReporters.find(
      item =>
        item.id ===
        reporterSelect.value
    );

  const reporterName =
    reporter
      ? reporter.name
      : "";

  const count =
    filteredArticles.length;

  if (count === 0) {
    searchMessage.textContent =
      "No matching articles.";

    return;
  }

  if (
    reporterName &&
    query
  ) {
    searchMessage.textContent =
      `${count} matching article` +
      `${count === 1 ? "" : "s"} ` +
      `by ${reporterName}.`;

    return;
  }

  if (reporterName) {
    searchMessage.textContent =
      `${count} published article` +
      `${count === 1 ? "" : "s"} ` +
      `by ${reporterName}.`;

    return;
  }

  if (query) {
    searchMessage.textContent =
      `${count} matching article` +
      `${count === 1 ? "" : "s"}.`;

    return;
  }

  searchMessage.textContent =
    `${count} published article` +
    `${count === 1 ? "" : "s"} available.`;
}

function getFilteredArticles() {
  const query =
    articleSearch.value
      .trim()
      .toLowerCase();

  const reporterId =
    reporterSelect.value;

  return allArticles.filter(
    article => {
      const reporterMatch =
        !reporterId ||
        article.reporterId ===
          reporterId;

      const searchMatch =
        !query ||
        article.title
          .toLowerCase()
          .includes(
            query
          );

      return (
        reporterMatch &&
        searchMatch
      );
    }
  );
}

function applyArticleFilters(
  preferredArticleId
) {
  const articles =
    getFilteredArticles();

  const selectedId =
    renderArticleOptions(
      articles,
      preferredArticleId
    );

  updateSearchMessage(
    articles
  );

  return selectedId;
}

function updateRangeControls() {
  const custom =
    rangeSelect.value ===
    "custom";

  customControls.hidden =
    !custom;

  if (custom) {
    updatePageUrl();

    return;
  }

  loadAnalytics();
}

if (
  articleSelect &&
  reporterSelect &&
  rangeSelect
) {
  collectArticles();

  populateReporterOptions();

  initialiseCustomRange();

  const requestedArticle =
    restorePageState();

  refreshReporterMenu();

  applyArticleFilters(
    requestedArticle
  );

  customControls.hidden =
    rangeSelect.value !==
    "custom";

  reporterButton.addEventListener(
    "click",
    function () {
      toggleCustomMenu(
        "reporter"
      );
    }
  );

  articleButton.addEventListener(
    "click",
    function () {
      toggleCustomMenu(
        "article"
      );
    }
  );

  articleSearch.addEventListener(
    "input",
    function () {
      const previousArticle =
        articleSelect.value;

      const selectedArticle =
        applyArticleFilters(
          previousArticle
        );

      if (
        selectedArticle !==
        previousArticle
      ) {
        loadAnalytics();
      } else {
        updatePageUrl();
      }
    }
  );

  rangeSelect.addEventListener(
    "change",
    updateRangeControls
  );

  applyCustomButton.addEventListener(
    "click",
    loadAnalytics
  );

  document.addEventListener(
    "click",
    function (event) {
      if (
        !event.target.closest(
          ".analytics-custom-select"
        )
      ) {
        closeCustomMenus();
      }
    }
  );

  document.addEventListener(
    "keydown",
    function (event) {
      if (
        event.key === "Escape"
      ) {
        closeCustomMenus();
      }
    }
  );

  const themeObserver =
    new MutationObserver(
      function (
        mutations
      ) {
        const changed =
          mutations.some(
            mutation =>
              mutation.attributeName ===
              "data-theme"
          );

        if (
          changed &&
          analyticsChart
        ) {
          applyChartTheme(
            analyticsChart
          );
        }
      }
    );

  themeObserver.observe(
    document.documentElement,
    {
      attributes:
        true,

      attributeFilter: [
        "data-theme"
      ]
    }
  );

  loadAnalytics();
}