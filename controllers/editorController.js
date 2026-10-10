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

function getEditorSort(
  sort
) {
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

async function getDashboard(
  req,
  res
) {
  try {
    const search =
      String(
        req.query.search || ""
      ).trim();

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
          escapeRegex(search),

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
          (page - 1) *
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

    res.render(
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

    res
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

    res.render(
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

    res
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
    const article =
      await Article.findById(
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

    if (
      article.status !==
      "pending"
    ) {
      return res
        .status(409)
        .json({
          message:
            "Only pending articles can be edited during review"
        });
    }

    const {
      title,
      summary,
      content,
      category,
      imageUrl
    } = req.body;

    article
      .workingVersion
      .title =
        String(
          title || ""
        ).trim();

    article
      .workingVersion
      .summary =
        String(
          summary || ""
        ).trim();

    article
      .workingVersion
      .content =
        String(
          content || ""
        );

    article
      .workingVersion
      .category =
        String(
          category || ""
        ).trim();

    article
      .workingVersion
      .imageUrl =
        String(
          imageUrl || ""
        ).trim();

    await article.save();

    res.json({
      message:
        "Article changes saved"
    });
  } catch (error) {
    console.error(
      "Editor update error:",
      error
    );

    res
      .status(500)
      .json({
        message:
          "Unable to save article"
      });
  }
}

async function approveArticle(
  req,
  res
) {
  try {
    const article =
      await Article.findById(
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

    if (
      !version.title ||
      !version.summary ||
      !version.content ||
      !version.category
    ) {
      return res
        .status(400)
        .json({
          message:
            "Title, summary, content and category are required"
        });
    }

    article.publishedVersion = {
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

    const publishTime =
      new Date();

    if (
      !article.publishedAt
    ) {
      article.publishedAt =
        publishTime;
    }

    article
      .publicationHistory
      .push({
        publishedAt:
          publishTime,

        editor:
          req.user._id
      });

    article.status =
      "published";

    article.editorNote =
      "";

    await article.save();

    res.json({
      message:
        "Article published successfully"
    });
  } catch (error) {
    console.error(
      "Approve article error:",
      error
    );

    res
      .status(500)
      .json({
        message:
          "Unable to publish article"
      });
  }
}

async function returnArticle(
  req,
  res
) {
  try {
    const article =
      await Article.findById(
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

    if (
      article.status !==
      "pending"
    ) {
      return res
        .status(409)
        .json({
          message:
            "Only pending articles can be returned"
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

    article.status =
      "returned";

    article.editorNote =
      note;

    await article.save();

    res.json({
      message:
        "Article returned to reporter"
    });
  } catch (error) {
    console.error(
      "Return article error:",
      error
    );

    res
      .status(500)
      .json({
        message:
          "Unable to return article"
      });
  }
}

async function deleteArticle(
  req,
  res
) {
  try {
    const article =
      await Article.findById(
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

    await article.deleteOne();

    res.json({
      message:
        "Article deleted successfully"
    });
  } catch (error) {
    console.error(
      "Delete article error:",
      error
    );

    res
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