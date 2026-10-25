const mongoose =
  require("mongoose");

const Article =
  require("../models/Article");

const PAGE_SIZE = 25;

const MAX_SEARCH_LENGTH = 200;

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
  "updated_asc",
  "published_desc",
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

function getReporterSort(sort) {
  if (
    sort === "updated_asc"
  ) {
    return {
      updatedAt: 1,
      _id: 1
    };
  }

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
      new URL(imageUrl);

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

    const filter = {
      author:
        req.user._id
    };

    if (status) {
      filter.status =
        status;
    }

    if (search) {
      filter[
        "workingVersion.title"
      ] = {
        $regex:
          escapeRegex(search),

        $options: "i"
      };
    }

    const totalArticles =
      await Article
        .countDocuments(
          filter
        );

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
        .sort(
          getReporterSort(
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
        sort
      });

    return res.render(
      "reporter/dashboard",
      {
        pageTitle:
          "Reporter Dashboard",

        articles,

        search,

        selectedStatus:
          status,

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
      "Reporter dashboard error:",
      error
    );

    return res
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
}

async function createArticle(
  req,
  res
) {
  try {
    const article =
      await Article.create({
        author:
          req.user._id,

        status:
          "draft"
      });

    return res.redirect(
      `/reporter/articles/${article._id}/edit`
    );
  } catch (error) {
    console.error(
      "Create article error:",
      error
    );

    return res
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
}

async function getEditArticle(
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
      await Article.findOne({
        _id:
          req.params.id,

        author:
          req.user._id
      });

    if (!article) {
      return res
        .status(404)
        .send(
          "Article not found"
        );
    }

    if (
      article.status ===
      "pending"
    ) {
      return res
        .status(409)
        .send(
          "Article is currently waiting for editor approval"
        );
    }

    return res.render(
      "reporter/edit",
      {
        pageTitle:
          "Edit Article",

        article
      }
    );
  } catch (error) {
    console.error(
      "Edit article error:",
      error
    );

    return res
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
}

async function autosaveArticle(
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

    const save = req.body.autosave;
    if (!save || !/^[a-zA-Z0-9-]{36}$/.test(save.clientId || "") ||
        !Number.isSafeInteger(save.sequence) || save.sequence < 1 ||
        !Number.isSafeInteger(save.revision) || save.revision < 0) {
      return res.status(400).json({ message: "Invalid autosave version. Reload the editor." });
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

    const existingArticle =
      await Article.findOne({
        _id:
          req.params.id,

        author:
          req.user._id
      })
        .select(
          "_id status autosaveClient autosaveSequence __v updatedAt"
        )
        .lean();

    if (!existingArticle) {
      return res
        .status(404)
        .json({
          message:
            "Article not found"
        });
    }

    if (
      existingArticle.status ===
      "pending"
    ) {
      return res
        .status(409)
        .json({
          message:
            "Article cannot be edited while waiting for approval"
        });
    }

    // A reload may retry its unacknowledged exit save after MongoDB accepted it.
    if (existingArticle.autosaveClient === save.clientId &&
        existingArticle.autosaveSequence === save.sequence) {
      return res.json({ message: "Saved", savedAt: existingArticle.updatedAt,
        revision: existingArticle.__v });
    }

    const sourceStatus =
      existingArticle.status;

    const nextStatus =
      sourceStatus ===
      "published"
        ? "draft"
        : sourceStatus;

    const updatedArticle =
      await Article.findOneAndUpdate(
        {
          _id:
            req.params.id,

          author:
            req.user._id,

          status:
            sourceStatus,

          // A new page must match the version it loaded. Within a page,
          // only increasing sequences may win (exit saves can overtake fetch).
          $or: [
            { __v: save.revision, autosaveClient: { $ne: save.clientId } },
            { autosaveClient: save.clientId, autosaveSequence: { $lt: save.sequence } }
          ]
        },
        {
          $set: {
            workingVersion:
              input,

            autosaveClient: save.clientId,
            autosaveSequence: save.sequence,

            status:
              nextStatus
          },
          $inc: { __v: 1 }
        },
        {
          new: true,
          runValidators: true
        }
      )
        .select(
          "_id status updatedAt __v"
        )
        .lean();

    if (!updatedArticle) {
      return res
        .status(409)
        .json({
          message:
            "A newer save or workflow change exists. Reload the editor before continuing."
        });
    }

    return res.json({
      message:
        "Saved",

      savedAt:
        updatedArticle.updatedAt,

      revision: updatedArticle.__v
    });
  } catch (error) {
    return handleApiError(
      error,
      res,
      "Autosave error:",
      "Unable to save article"
    );
  }
}

async function submitArticle(
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
      await Article.findOne({
        _id:
          req.params.id,

        author:
          req.user._id
      })
        .select(
          "status workingVersion"
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
      ![
        "draft",
        "returned"
      ].includes(
        article.status
      )
    ) {
      return res
        .status(409)
        .json({
          message:
            "Article cannot be submitted in its current state"
        });
    }

    const input = {
      title:
        article
          .workingVersion
          .title,

      summary:
        article
          .workingVersion
          .summary,

      content:
        article
          .workingVersion
          .content,

      category:
        article
          .workingVersion
          .category,

      imageUrl:
        article
          .workingVersion
          .imageUrl
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

    const sourceStatus =
      article.status;

    const result =
      await Article.updateOne(
        {
          _id:
            article._id,

          author:
            req.user._id,

          status:
            sourceStatus
        },
        {
          $set: {
            status:
              "pending",

            editorNote:
              ""
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
            "Article state changed before submission. Please try again."
        });
    }

    return res.json({
      message:
        "Article submitted for editor approval"
    });
  } catch (error) {
    return handleApiError(
      error,
      res,
      "Submit article error:",
      "Unable to submit article"
    );
  }
}

module.exports = {
  getDashboard,
  createArticle,
  getEditArticle,
  autosaveArticle,
  submitArticle
};