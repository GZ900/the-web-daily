"use strict";

const articleSelect =
  document.querySelector(
    "#analytics-article"
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

let analyticsChart = null;

function formatDateTime(dateValue) {
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
    ).format(date);
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
    ).format(date);
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
    ).format(date);
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  ).format(date);
}

function toDateTimeLocalValue(
  date
) {
  const pad =
    value =>
      String(value)
        .padStart(
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
      6 * 60 * 60 * 1000
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
          "#c0392b";

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
          "#c0392b";

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
        type: "line",

        data: {
          labels,

          datasets: [
            {
              label:
                "Views",

              data:
                views,

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
                0.15,

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
                true
            },

            tooltip: {
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
              ticks: {
                maxTicksLimit:
                  14
              },

              title: {
                display:
                  true,

                text:
                  "Time"
              }
            },

            y: {
              beginAtZero:
                true,

              ticks: {
                precision:
                  0
              },

              title: {
                display:
                  true,

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

async function loadAnalytics() {
  if (
    !articleSelect ||
    !rangeSelect
  ) {
    return;
  }

  const url =
    getAnalyticsUrl();

  if (!url) {
    messageElement.textContent =
      "Choose a valid start and end time.";

    return;
  }

  messageElement.textContent =
    "Loading...";

  try {
    const response =
      await fetch(url);

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

    createChart(data);

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

function updateRangeControls() {
  const custom =
    rangeSelect.value ===
    "custom";

  customControls.hidden =
    !custom;

  if (!custom) {
    loadAnalytics();
  }
}

if (
  articleSelect &&
  rangeSelect
) {
  initialiseCustomRange();

  articleSelect.addEventListener(
    "change",
    loadAnalytics
  );

  rangeSelect.addEventListener(
    "change",
    updateRangeControls
  );

  applyCustomButton.addEventListener(
    "click",
    loadAnalytics
  );

  loadAnalytics();
}