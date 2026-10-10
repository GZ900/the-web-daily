const Article =
  require("../models/Article");

const PAGE_SIZE = 25;

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

function getReporterSort(
  sort
) {
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
      await Article.countDocuments(
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
          (page - 1) *
          PAGE_SIZE
        )
        .limit(
          PAGE_SIZE
        );

    const paginationQuery =
      buildPaginationQuery({
        search,
        status,
        sort
      });

    res.render(
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

    res
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

    res.redirect(
      `/reporter/articles/${article._id}/edit`
    );
  } catch (error) {
    console.error(
      "Create article error:",
      error
    );

    res
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
        .status(403)
        .send(
          "Article is currently waiting for editor approval"
        );
    }

    res.render(
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

    res
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
        .json({
          message:
            "Article not found"
        });
    }

    if (
      article.status ===
      "pending"
    ) {
      return res
        .status(409)
        .json({
          message:
            "Article cannot be edited while waiting for approval"
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

    if (
      article.status ===
      "published"
    ) {
      article.status =
        "draft";
    }

    await article.save();

    res.json({
      message: "Saved",
      savedAt:
        new Date()
    });
  } catch (error) {
    console.error(
      "Autosave error:",
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

async function submitArticle(
  req,
  res
) {
  try {
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

    article.status =
      "pending";

    article.editorNote =
      "";

    await article.save();

    res.json({
      message:
        "Article submitted for editor approval"
    });
  } catch (error) {
    console.error(
      "Submit article error:",
      error
    );

    res
      .status(500)
      .json({
        message:
          "Unable to submit article"
      });
  }
}

module.exports = {
  getDashboard,
  createArticle,
  getEditArticle,
  autosaveArticle,
  submitArticle
};