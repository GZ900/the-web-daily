const mongoose =
  require("mongoose");

const Article =
  require("../models/Article");

require("../models/User");

const PAGE_SIZE = 20;
const MAX_PAGE = 10000;
const MAX_SEARCH_LENGTH = 200;
const MAX_CATEGORY_LENGTH = 80;

const VALID_SORTS = [
  "newest",
  "popular"
];

const VALID_VIEWED_FILTERS = [
  "all",
  "viewed",
  "unviewed"
];

function escapeRegex(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function getPage(value) {
  const parsed =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isFinite(parsed) ||
    parsed < 1
  ) {
    return 1;
  }

  return Math.min(
    parsed,
    MAX_PAGE
  );
}

function getLimitedText(
  value,
  maxLength
) {
  return String(
    value || ""
  )
    .trim()
    .slice(
      0,
      maxLength
    );
}

function getViewedIds(value) {
  const rawIds =
    String(
      value || ""
    )
      .split(",")
      .map(
        id => id.trim()
      )
      .filter(Boolean);

  const validIds =
    rawIds.filter(
      id =>
        mongoose.isValidObjectId(
          id
        )
    );

  return [
    ...new Set(validIds)
  ];
}

async function getFeedArticles(
  req,
  res
) {
  try {
    const page =
      getPage(
        req.query.page
      );

    const search =
      getLimitedText(
        req.query.search,
        MAX_SEARCH_LENGTH
      );

    const category =
      getLimitedText(
        req.query.category,
        MAX_CATEGORY_LENGTH
      );

    const requestedSort =
      String(
        req.query.sort ||
        "newest"
      );

    const sort =
      VALID_SORTS.includes(
        requestedSort
      )
        ? requestedSort
        : "newest";

    const requestedViewed =
      String(
        req.query.viewed ||
        "all"
      );

    const viewed =
      VALID_VIEWED_FILTERS.includes(
        requestedViewed
      )
        ? requestedViewed
        : "all";

    const viewedIds =
      getViewedIds(
        req.query.viewedIds
      );

    const filter = {
      publishedVersion: {
        $ne: null
      }
    };

    if (search) {
      filter[
        "publishedVersion.title"
      ] = {
        $regex:
          escapeRegex(search),

        $options: "i"
      };
    }

    if (category) {
      filter[
        "publishedVersion.category"
      ] = category;
    }

    if (
      viewed === "viewed"
    ) {
      if (
        viewedIds.length === 0
      ) {
        return res.json({
          articles: [],
          hasMore: false
        });
      }

      filter._id = {
        $in: viewedIds
      };
    }

    if (
      viewed === "unviewed" &&
      viewedIds.length > 0
    ) {
      filter._id = {
        $nin: viewedIds
      };
    }

    const sortOption =
      sort === "popular"
        ? {
            totalViews: -1,
            publishedAt: -1,
            _id: -1
          }
        : {
            publishedAt: -1,
            _id: -1
          };

    const articles =
      await Article.find(
        filter
      )
        .select(
          [
            "_id",
            "publishedVersion.title",
            "publishedVersion.summary",
            "publishedVersion.category",
            "publishedVersion.imageUrl",
            "author",
            "publishedAt",
            "totalViews"
          ].join(" ")
        )
        .populate(
          "author",
          "displayName"
        )
        .sort(
          sortOption
        )
        .skip(
          (
            page - 1
          ) *
          PAGE_SIZE
        )
        .limit(
          PAGE_SIZE + 1
        )
        .lean();

    const hasMore =
      articles.length >
      PAGE_SIZE;

    const pageArticles =
      articles.slice(
        0,
        PAGE_SIZE
      );

    return res.json({
      articles:
        pageArticles.map(
          article => ({
            id:
              article._id,

            title:
              article
                .publishedVersion
                .title,

            summary:
              article
                .publishedVersion
                .summary,

            category:
              article
                .publishedVersion
                .category,

            imageUrl:
              article
                .publishedVersion
                .imageUrl,

            author:
              article.author
                ?.displayName ||
              "Unknown",

            publishedAt:
              article.publishedAt,

            totalViews:
              article.totalViews ||
              0
          })
        ),

      hasMore
    });
  } catch (error) {
    console.error(
      "Feed API error:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Unable to load articles"
      });
  }
}

module.exports = {
  getFeedArticles
};