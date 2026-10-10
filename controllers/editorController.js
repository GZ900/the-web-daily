const mongoose =
  require("mongoose");

const Article =
  require("../models/Article");

const Comment =
  require("../models/Comment");

const ViewStat =
  require("../models/ViewStat");

const User =
  require("../models/User");

const PAGE_SIZE = 25;

const MAX_SEARCH_LENGTH = 200;

const MAX_EDITOR_NOTE_LENGTH =
  1000;

const ARTICLE_LIMITS = {
  title: 200,
  summary: 600,
  content: 50000,
  category: 80,
  imageUrl: 2048
};

const VALID_STATUSES = [
  "draft",
  "pending",
  "published",
  "returned"
];

const VALID_SORTS = [
  "updated_desc",
  "published_desc",
  "popular",
  "title_asc"
];

function escapeRegex(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function getSearchValue(value) {
  return String(
    value || ""
  )
    .trim()
    .slice(
      0,
      MAX_SEARCH_LENGTH
    );
}

function getEditorSort(sort) {
  if (
    sort ===
    "published_desc"
  ) {
    return {
      publishedAt: -1,
      updatedAt: -1,
      _id: -1
    };
  }

  if (
    sort === "popular"
  ) {
    return {
      totalViews: -1,
      updatedAt: -1,
      _id: -1
    };
  }

  if (
    sort === "title_asc"
  ) {
    return {
      "workingVersion.title": 1,
      _id: 1
    };
  }

  return {
    updatedAt: -1,
    _id: -1
  };
}

function buildPaginationQuery({
  search,
  status,
  reporter,
  sort
}) {
  const params =
    new URLSearchParams();

  if (search) {
    params.set(
      "search",
      search
    );
  }

  if (status) {
    params.set(
      "status",
      status
    );
  }

  if (reporter) {
    params.set(
      "reporter",
      reporter
    );
  }

  if (
    sort &&
    sort !== "updated_desc"
  ) {
    params.set(
      "sort",
      sort
    );
  }

  return params.toString();
}

function getArticleInput(body) {
  return {
    title:
      String(
        body.title || ""
      ).trim(),

    summary:
      String(
        body.summary || ""
      ).trim(),

    content:
      String(
        body.content || ""
      ),

    category:
      String(
        body.category || ""
      ).trim(),

    imageUrl:
      String(
        body.imageUrl || ""
      ).trim()
  };
}

function isValidImageUrl(
  imageUrl
) {
  if (!imageUrl) {
    return true;
  }

  if (
    imageUrl.startsWith("/")
  ) {
    return true;
  }

  try {
    const parsedUrl =
      new URL(
        imageUrl
      );

    return [
      "http:",
      "https:"
    ].includes(
      parsedUrl.protocol
    );
  } catch {
    return false;
  }
}

function validateArticleInput(
  input,
  {
    requireCoreFields = false
  } = {}
) {
  if (
    input.title.length >
    ARTICLE_LIMITS.title
  ) {
    return "Title is too long";
  }

  if (
    input.summary.length >
    ARTICLE_LIMITS.summary
  ) {
    return "Summary is too long";
  }

  if (
    input.content.length >
    ARTICLE_LIMITS.content
  ) {
    return "Article content is too long";
  }

  if (
    input.category.length >
    ARTICLE_LIMITS.category
  ) {
    return "Category is too long";
  }

  if (
    input.imageUrl.length >
    ARTICLE_LIMITS.imageUrl
  ) {
    return "Image URL is too long";
  }

  if (
    !isValidImageUrl(
      input.imageUrl
    )
  ) {
    return "Image URL must be a valid HTTP, HTTPS or local URL";
  }

  if (
    requireCoreFields &&
    (
      !input.title ||
      !input.summary ||
      !input.content.trim() ||
      !input.category
    )
  ) {
    return "Title, summary, content and category are required";
  }

  return null;
}

function handleApiError(
  error,
  res,
  logMessage,
  clientMessage
) {
  if (
    error &&
    error.name ===
    "ValidationError"
  ) {
    return res
      .status(400)
      .json({
        message:
          error.message
      });
  }

  console.error(
    logMessage,
    error
  );

  return res
    .status(500)
    .json({
      message:
        clientMessage
    });
}

async function getDashboard(
  req,
  res
) {
  try {
    const search =
      getSearchValue(
        req.query.search
      );

    const requestedStatus =
      String(
        req.query.status || ""
      );

    const status =
      VALID_STATUSES.includes(
        requestedStatus
      )
        ? requestedStatus
        : "";

    const requestedReporter =
      String(
        req.query.reporter || ""
      );

    const reporter =
      mongoose.isValidObjectId(
        requestedReporter
      )
        ? requestedReporter
        : "";

    const requestedSort =
      String(
        req.query.sort ||
        "updated_desc"
      );

    const sort =
      VALID_SORTS.includes(
        requestedSort
      )
        ? requestedSort
        : "updated_desc";

    const requestedPage =
      Math.max(
        Number.parseInt(
          req.query.page,
          10
        ) || 1,
        1
      );

    const filter = {};

    if (status) {
      filter.status =
        status;
    }

    if (reporter) {
      filter.author =
        reporter;
    }

    if (search) {
      filter[
        "workingVersion.title"
      ] = {
        $regex:
          escapeRegex(
            search
          ),

        $options: "i"
      };
    }

    const [
      totalArticles,
      reporters
    ] =
      await Promise.all([
        Article.countDocuments(
          filter
        ),

        User.find({
          role: "reporter"
        })
          .select(
            "_id username displayName"
          )
          .sort({
            displayName: 1
          })
          .lean()
      ]);

    const totalPages =
      Math.max(
        Math.ceil(
          totalArticles /
          PAGE_SIZE
        ),
        1
      );

    const page =
      Math.min(
        requestedPage,
        totalPages
      );

    const articles =
      await Article.find(
        filter
      )
        .populate(
          "author",
          "displayName username"
        )
        .sort(
          getEditorSort(
            sort
          )
        )
        .skip(
          (
            page - 1
          ) *
          PAGE_SIZE
        )
        .limit(
          PAGE_SIZE
        )
        .lean();

    const paginationQuery =
      buildPaginationQuery({
        search,
        status,
        reporter,
        sort
      });

    return res.render(
      "editor/dashboard",
      {
        pageTitle:
          "Editor Dashboard",

        articles,
        reporters,

        search,

        selectedStatus:
          status,

        selectedReporter:
          reporter,

        selectedSort:
          sort,

        page,
        totalPages,
        totalArticles,

        pageSize:
          PAGE_SIZE,

        paginationQuery
      }
    );
  } catch (error) {
    console.error(
      "Editor dashboard error:",
      error
    );

    return res
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
}

async function getReviewArticle(
  req,
  res
) {
  try {
    if (
      !mongoose.isValidObjectId(
        req.params.id
      )
    ) {
      return res
        .status(400)
        .send(
          "Invalid article ID"
        );
    }

    const article =
      await Article.findById(
        req.params.id
      )
        .populate(
          "author",
          "displayName username"
        );

    if (!article) {
      return res
        .status(404)
        .send(
          "Article not found"
        );
    }

    return res.render(
      "editor/review",
      {
        pageTitle:
          "Review Article",

        article
      }
    );
  } catch (error) {
    console.error(
      "Editor review error:",
      error
    );

    return res
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
}

async function updateArticle(
  req,
  res
) {
  try {
    if (
      !mongoose.isValidObjectId(
        req.params.id
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid article ID"
        });
    }

    const input =
      getArticleInput(
        req.body
      );

    const validationError =
      validateArticleInput(
        input
      );

    if (validationError) {
      return res
        .status(400)
        .json({
          message:
            validationError
        });
    }

    const result =
      await Article.updateOne(
        {
          _id:
            req.params.id,

          status:
            "pending"
        },
        {
          $set: {
            workingVersion:
              input
          }
        },
        {
          runValidators: true
        }
      );

    if (
      result.matchedCount === 0
    ) {
      const exists =
        await Article.exists({
          _id:
            req.params.id
        });

      if (!exists) {
        return res
          .status(404)
          .json({
            message:
              "Article not found"
          });
      }

      return res
        .status(409)
        .json({
          message:
            "Only pending articles can be edited during review"
        });
    }

    return res.json({
      message:
        "Article changes saved"
    });
  } catch (error) {
    return handleApiError(
      error,
      res,
      "Editor update error:",
      "Unable to save article"
    );
  }
}

async function approveArticle(
  req,
  res
) {
  try {
    if (
      !mongoose.isValidObjectId(
        req.params.id
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid article ID"
        });
    }

    const article =
      await Article.findById(
        req.params.id
      )
        .select(
          "status workingVersion publishedAt updatedAt"
        );

    if (!article) {
      return res
        .status(404)
        .json({
          message:
            "Article not found"
        });
    }

    if (
      article.status !==
      "pending"
    ) {
      return res
        .status(409)
        .json({
          message:
            "Only pending articles can be approved"
        });
    }

    const version =
      article.workingVersion;

    const input = {
      title:
        version.title,

      summary:
        version.summary,

      content:
        version.content,

      category:
        version.category,

      imageUrl:
        version.imageUrl
    };

    const validationError =
      validateArticleInput(
        input,
        {
          requireCoreFields:
            true
        }
      );

    if (validationError) {
      return res
        .status(400)
        .json({
          message:
            validationError
        });
    }

    const publishTime =
      new Date();

    const setFields = {
      publishedVersion: {
        title:
          input.title,

        summary:
          input.summary,

        content:
          input.content,

        category:
          input.category,

        imageUrl:
          input.imageUrl
      },

      status:
        "published",

      editorNote:
        ""
    };

    if (
      !article.publishedAt
    ) {
      setFields.publishedAt =
        publishTime;
    }

    const result =
      await Article.updateOne(
        {
          _id:
            article._id,

          status:
            "pending",

          updatedAt:
            article.updatedAt
        },
        {
          $set:
            setFields,

          $push: {
            publicationHistory: {
              publishedAt:
                publishTime,

              editor:
                req.user._id
            }
          }
        }
      );

    if (
      result.modifiedCount !== 1
    ) {
      return res
        .status(409)
        .json({
          message:
            "The article changed while it was being approved. Refresh and try again."
        });
    }

    return res.json({
      message:
        "Article published successfully"
    });
  } catch (error) {
    return handleApiError(
      error,
      res,
      "Approve article error:",
      "Unable to publish article"
    );
  }
}

async function returnArticle(
  req,
  res
) {
  try {
    if (
      !mongoose.isValidObjectId(
        req.params.id
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid article ID"
        });
    }

    const note =
      String(
        req.body.note || ""
      ).trim();

    if (!note) {
      return res
        .status(400)
        .json({
          message:
            "An editor note is required"
        });
    }

    if (
      note.length >
      MAX_EDITOR_NOTE_LENGTH
    ) {
      return res
        .status(400)
        .json({
          message:
            "Editor note is too long"
        });
    }

    const result =
      await Article.updateOne(
        {
          _id:
            req.params.id,

          status:
            "pending"
        },
        {
          $set: {
            status:
              "returned",

            editorNote:
              note
          }
        },
        {
          runValidators: true
        }
      );

    if (
      result.matchedCount === 0
    ) {
      const exists =
        await Article.exists({
          _id:
            req.params.id
        });

      if (!exists) {
        return res
          .status(404)
          .json({
            message:
              "Article not found"
          });
      }

      return res
        .status(409)
        .json({
          message:
            "Only pending articles can be returned"
        });
    }

    return res.json({
      message:
        "Article returned to reporter"
    });
  } catch (error) {
    return handleApiError(
      error,
      res,
      "Return article error:",
      "Unable to return article"
    );
  }
}

async function deleteArticle(
  req,
  res
) {
  try {
    if (
      !mongoose.isValidObjectId(
        req.params.id
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid article ID"
        });
    }

    /*
      Delete the article first.

      Once it no longer exists,
      new public views/comments
      cannot be created for it.
    */
    const article =
      await Article.findByIdAndDelete(
        req.params.id
      );

    if (!article) {
      return res
        .status(404)
        .json({
          message:
            "Article not found"
        });
    }

    await Promise.all([
      Comment.deleteMany({
        article:
          article._id
      }),

      ViewStat.deleteMany({
        article:
          article._id
      })
    ]);

    return res.json({
      message:
        "Article deleted successfully"
    });
  } catch (error) {
    console.error(
      "Delete article error:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Unable to delete article"
      });
  }
}

module.exports = {
  getDashboard,
  getReviewArticle,
  updateArticle,
  approveArticle,
  returnArticle,
  deleteArticle
};