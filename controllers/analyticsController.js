const Article =
  require("../models/Article");

const ViewStat =
  require("../models/ViewStat");

const MINUTE =
  60 * 1000;

const HOUR =
  60 * MINUTE;

const DAY =
  24 * HOUR;

const MAX_CUSTOM_RANGE =
  90 * DAY;

const PRESET_RANGES = {
  "30m": 30 * MINUTE,
  "1h": HOUR,
  "3h": 3 * HOUR,
  "6h": 6 * HOUR,
  "12h": 12 * HOUR,
  "24h": 24 * HOUR,
  "7d": 7 * DAY,
  "30d": 30 * DAY,
  "90d": 90 * DAY
};

function getBucketConfig(
  duration
) {
  if (duration <= 12 * HOUR) {
    return {
      unit: "minute",
      binSize: 5,
      stepMs: 5 * MINUTE,
      bucketMinutes: 5
    };
  }

  if (duration <= 24 * HOUR) {
    return {
      unit: "minute",
      binSize: 15,
      stepMs: 15 * MINUTE,
      bucketMinutes: 15
    };
  }

  if (duration <= 7 * DAY) {
    return {
      unit: "hour",
      binSize: 1,
      stepMs: HOUR,
      bucketMinutes: 60
    };
  }

  if (duration <= 30 * DAY) {
    return {
      unit: "hour",
      binSize: 6,
      stepMs: 6 * HOUR,
      bucketMinutes: 360
    };
  }

  return {
    unit: "day",
    binSize: 1,
    stepMs: DAY,
    bucketMinutes: 1440
  };
}

function floorToBucket(
  date,
  stepMs
) {
  return new Date(
    Math.floor(
      date.getTime() /
      stepMs
    ) * stepMs
  );
}

function resolveTimeRange(req) {
  const range =
    String(
      req.query.range ||
      "7d"
    );

  const now =
    new Date();

  if (range === "custom") {
    const start =
      new Date(
        req.query.start
      );

    const end =
      new Date(
        req.query.end
      );

    if (
      Number.isNaN(
        start.getTime()
      ) ||
      Number.isNaN(
        end.getTime()
      )
    ) {
      return {
        error:
          "Invalid custom date range"
      };
    }

    if (start >= end) {
      return {
        error:
          "Start time must be before end time"
      };
    }

    const duration =
      end.getTime() -
      start.getTime();

    if (
      duration >
      MAX_CUSTOM_RANGE
    ) {
      return {
        error:
          "Custom range cannot exceed 90 days"
      };
    }

    return {
      range,
      start,
      end,
      duration
    };
  }

  const duration =
    PRESET_RANGES[range];

  if (!duration) {
    return {
      error:
        "Invalid analytics range"
    };
  }

  return {
    range,
    start:
      new Date(
        now.getTime() -
        duration
      ),
    end: now,
    duration
  };
}

async function getAnalyticsPage(
  req,
  res
) {
  try {
    const articles =
      await Article.find({
        publishedVersion: {
          $ne: null
        }
      })
        .populate(
          "author",
          "displayName"
        )
        .sort({
          publishedAt: -1
        })
        .lean();

    res.render(
      "editor/analytics",
      {
        pageTitle:
          "Analytics Impact",

        articles
      }
    );
  } catch (error) {
    console.error(
      "Analytics page error:",
      error
    );

    res
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
}

async function getArticleAnalytics(
  req,
  res
) {
  try {
    const timeRange =
      resolveTimeRange(req);

    if (timeRange.error) {
      return res
        .status(400)
        .json({
          message:
            timeRange.error
        });
    }

    const article =
      await Article.findOne({
        _id: req.params.id,

        publishedVersion: {
          $ne: null
        }
      }).lean();

    if (!article) {
      return res
        .status(404)
        .json({
          message:
            "Published article not found"
        });
    }

    const {
      range,
      start,
      end,
      duration
    } = timeRange;

    const bucket =
      getBucketConfig(
        duration
      );

    const stats =
      await ViewStat.aggregate([
        {
          $match: {
            article:
              article._id,

            bucketStart: {
              $gte: start,
              $lte: end
            }
          }
        },

        {
          $group: {
            _id: {
              $dateTrunc: {
                date:
                  "$bucketStart",

                unit:
                  bucket.unit,

                binSize:
                  bucket.binSize,

                timezone:
                  "UTC"
              }
            },

            views: {
              $sum:
                "$views"
            }
          }
        },

        {
          $sort: {
            _id: 1
          }
        }
      ]);

    const statMap =
      new Map();

    for (
      const stat of stats
    ) {
      statMap.set(
        new Date(
          stat._id
        ).getTime(),

        stat.views
      );
    }

    const points = [];

    const firstBucket =
      floorToBucket(
        start,
        bucket.stepMs
      );

    const lastBucket =
      floorToBucket(
        end,
        bucket.stepMs
      );

    for (
      let time =
        firstBucket.getTime();

      time <=
        lastBucket.getTime();

      time +=
        bucket.stepMs
    ) {
      points.push({
        time:
          new Date(time),

        views:
          statMap.get(time) ||
          0
      });
    }

    const publicationHistory =
      Array.isArray(
        article.publicationHistory
      )
        ? article.publicationHistory
        : [];

    const publications =
      publicationHistory
        .map(
          (
            publication,
            index
          ) => ({
            time:
              publication.publishedAt,

            label:
              index === 0
                ? "Initial publication"
                : `Published update ${index}`
          })
        )
        .filter(
          publication => {
            if (
              !publication.time
            ) {
              return false;
            }

            const time =
              new Date(
                publication.time
              );

            return (
              time >= start &&
              time <= end
            );
          }
        );

    res.json({
      article: {
        id:
          article._id,

        title:
          article
            .publishedVersion
            .title,

        totalViews:
          article.totalViews
      },

      range,

      start,
      end,

      bucketMinutes:
        bucket.bucketMinutes,

      points,

      publications
    });
  } catch (error) {
    console.error(
      "Analytics API error:",
      error
    );

    res
      .status(500)
      .json({
        message:
          "Unable to load analytics"
      });
  }
}

module.exports = {
  getAnalyticsPage,
  getArticleAnalytics
};