const mongoose =
  require("mongoose");

const User =
  require("../models/User");

const Article =
  require("../models/Article");

const Comment =
  require("../models/Comment");

const ViewStat =
  require("../models/ViewStat");

const {
  hashPassword
} = require(
  "../services/passwordService"
);

const PAGE_SIZE = 25;

function escapeRegex(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function getPage(value) {
  return Math.max(
    Number.parseInt(
      value,
      10
    ) || 1,
    1
  );
}

function handleValidationError(
  error,
  res,
  fallbackMessage
) {
  if (
    error &&
    error.code === 11000
  ) {
    return res
      .status(409)
      .json({
        message:
          "That username already exists"
      });
  }

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
    fallbackMessage,
    error
  );

  return res
    .status(500)
    .json({
      message:
        "Internal Server Error"
    });
}

/*
  USERS
*/

async function getUsersPage(
  req,
  res
) {
  try {
    const search =
      String(
        req.query.search || ""
      ).trim();

    const requestedRole =
      String(
        req.query.role || ""
      );

    const role =
      [
        "reporter",
        "editor"
      ].includes(
        requestedRole
      )
        ? requestedRole
        : "";

    const page =
      getPage(
        req.query.page
      );

    const filter = {};

    if (role) {
      filter.role =
        role;
    }

    if (search) {
      const regex =
        new RegExp(
          escapeRegex(
            search
          ),
          "i"
        );

      filter.$or = [
        {
          username:
            regex
        },

        {
          displayName:
            regex
        }
      ];
    }

    const totalUsers =
      await User.countDocuments(
        filter
      );

    const totalPages =
      Math.max(
        Math.ceil(
          totalUsers /
          PAGE_SIZE
        ),
        1
      );

    const safePage =
      Math.min(
        page,
        totalPages
      );

    const users =
      await User.find(
        filter
      )
        .select(
          "_id username displayName role createdAt updatedAt"
        )
        .sort({
          displayName: 1,
          username: 1
        })
        .skip(
          (
            safePage - 1
          ) *
          PAGE_SIZE
        )
        .limit(
          PAGE_SIZE
        )
        .lean();

    const params =
      new URLSearchParams();

    if (search) {
      params.set(
        "search",
        search
      );
    }

    if (role) {
      params.set(
        "role",
        role
      );
    }

    res.render(
      "editor/users",
      {
        pageTitle:
          "User Management",

        users,

        search,
        selectedRole:
          role,

        page:
          safePage,

        totalPages,
        totalUsers,

        paginationQuery:
          params.toString()
      }
    );
  } catch (error) {
    console.error(
      "User management page error:",
      error
    );

    res
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
}

async function createUser(
  req,
  res
) {
  try {
    const username =
      String(
        req.body.username || ""
      ).trim();

    const displayName =
      String(
        req.body.displayName || ""
      ).trim();

    const password =
      String(
        req.body.password || ""
      );

    const role =
      String(
        req.body.role || ""
      );

    if (
      !username ||
      !displayName ||
      !password
    ) {
      return res
        .status(400)
        .json({
          message:
            "Username, display name and password are required"
        });
    }

    if (
      ![
        "reporter",
        "editor"
      ].includes(role)
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid user role"
        });
    }

    if (
      password.length < 8
    ) {
      return res
        .status(400)
        .json({
          message:
            "Password must contain at least 8 characters"
        });
    }

    const {
      passwordHash,
      passwordSalt
    } =
      hashPassword(
        password
      );

    const user =
      await User.create({
        username,
        displayName,
        role,
        passwordHash,
        passwordSalt
      });

    res
      .status(201)
      .json({
        message:
          "User created successfully",

        user: {
          id:
            user._id,

          username:
            user.username,

          displayName:
            user.displayName,

          role:
            user.role
        }
      });
  } catch (error) {
    return handleValidationError(
      error,
      res,
      "Create user error:"
    );
  }
}

async function updateUser(
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
            "Invalid user ID"
        });
    }

    const user =
      await User.findById(
        req.params.id
      ).select(
        "+passwordHash +passwordSalt"
      );

    if (!user) {
      return res
        .status(404)
        .json({
          message:
            "User not found"
        });
    }

    const username =
      String(
        req.body.username || ""
      ).trim();

    const displayName =
      String(
        req.body.displayName || ""
      ).trim();

    const role =
      String(
        req.body.role || ""
      );

    const password =
      String(
        req.body.password || ""
      );

    if (
      !username ||
      !displayName
    ) {
      return res
        .status(400)
        .json({
          message:
            "Username and display name are required"
        });
    }

    if (
      ![
        "reporter",
        "editor"
      ].includes(role)
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid user role"
        });
    }

    const isCurrentUser =
      String(
        user._id
      ) ===
      String(
        req.user._id
      );

    if (
      isCurrentUser &&
      role !== "editor"
    ) {
      return res
        .status(409)
        .json({
          message:
            "You cannot remove your own editor role"
        });
    }

    if (
      user.role ===
        "editor" &&
      role !==
        "editor"
    ) {
      const editorCount =
        await User.countDocuments({
          role: "editor"
        });

      if (
        editorCount <= 1
      ) {
        return res
          .status(409)
          .json({
            message:
              "The system must keep at least one editor"
          });
      }
    }

    user.username =
      username;

    user.displayName =
      displayName;

    user.role =
      role;

    if (password) {
      if (
        password.length < 8
      ) {
        return res
          .status(400)
          .json({
            message:
              "Password must contain at least 8 characters"
          });
      }

      const {
        passwordHash,
        passwordSalt
      } =
        hashPassword(
          password
        );

      user.passwordHash =
        passwordHash;

      user.passwordSalt =
        passwordSalt;
    }

    await user.save();

    res.json({
      message:
        "User updated successfully"
    });
  } catch (error) {
    return handleValidationError(
      error,
      res,
      "Update user error:"
    );
  }
}

async function deleteUser(
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
            "Invalid user ID"
        });
    }

    const user =
      await User.findById(
        req.params.id
      );

    if (!user) {
      return res
        .status(404)
        .json({
          message:
            "User not found"
        });
    }

    if (
      String(
        user._id
      ) ===
      String(
        req.user._id
      )
    ) {
      return res
        .status(409)
        .json({
          message:
            "You cannot delete your own account"
        });
    }

    if (
      user.role ===
      "editor"
    ) {
      const editorCount =
        await User.countDocuments({
          role: "editor"
        });

      if (
        editorCount <= 1
      ) {
        return res
          .status(409)
          .json({
            message:
              "The system must keep at least one editor"
          });
      }
    }

    const ownsArticles =
      await Article.exists({
        author:
          user._id
      });

    if (ownsArticles) {
      return res
        .status(409)
        .json({
          message:
            "This user owns articles and cannot be deleted"
        });
    }

    await user.deleteOne();

    res.json({
      message:
        "User deleted successfully"
    });
  } catch (error) {
    console.error(
      "Delete user error:",
      error
    );

    res
      .status(500)
      .json({
        message:
          "Unable to delete user"
      });
  }
}

/*
  COMMENTS
*/

async function getCommentsPage(
  req,
  res
) {
  try {
    const search =
      String(
        req.query.search || ""
      ).trim();

    const sort =
      req.query.sort ===
        "oldest"
        ? "oldest"
        : "newest";

    const page =
      getPage(
        req.query.page
      );

    const filter = {};

    if (search) {
      const regex =
        new RegExp(
          escapeRegex(
            search
          ),
          "i"
        );

      filter.$or = [
        {
          name:
            regex
        },

        {
          text:
            regex
        }
      ];
    }

    const totalComments =
      await Comment.countDocuments(
        filter
      );

    const totalPages =
      Math.max(
        Math.ceil(
          totalComments /
          PAGE_SIZE
        ),
        1
      );

    const safePage =
      Math.min(
        page,
        totalPages
      );

    const comments =
      await Comment.find(
        filter
      )
        .populate(
          "article",
          "workingVersion.title publishedVersion.title"
        )
        .sort({
          createdAt:
            sort ===
            "oldest"
              ? 1
              : -1
        })
        .skip(
          (
            safePage - 1
          ) *
          PAGE_SIZE
        )
        .limit(
          PAGE_SIZE
        )
        .lean();

    const params =
      new URLSearchParams();

    if (search) {
      params.set(
        "search",
        search
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

    res.render(
      "editor/comments",
      {
        pageTitle:
          "Comment Management",

        comments,

        search,
        selectedSort:
          sort,

        page:
          safePage,

        totalPages,
        totalComments,

        paginationQuery:
          params.toString()
      }
    );
  } catch (error) {
    console.error(
      "Comment management page error:",
      error
    );

    res
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
}

async function updateComment(
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
            "Invalid comment ID"
        });
    }

    const comment =
      await Comment.findById(
        req.params.id
      );

    if (!comment) {
      return res
        .status(404)
        .json({
          message:
            "Comment not found"
        });
    }

    const name =
      String(
        req.body.name || ""
      ).trim();

    const text =
      String(
        req.body.text || ""
      ).trim();

    if (
      !name ||
      !text
    ) {
      return res
        .status(400)
        .json({
          message:
            "Name and comment text are required"
        });
    }

    comment.name =
      name;

    comment.text =
      text;

    await comment.save();

    res.json({
      message:
        "Comment updated successfully"
    });
  } catch (error) {
    return handleValidationError(
      error,
      res,
      "Update comment error:"
    );
  }
}

async function deleteComment(
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
            "Invalid comment ID"
        });
    }

    const comment =
      await Comment.findById(
        req.params.id
      );

    if (!comment) {
      return res
        .status(404)
        .json({
          message:
            "Comment not found"
        });
    }

    await comment.deleteOne();

    res.json({
      message:
        "Comment deleted successfully"
    });
  } catch (error) {
    console.error(
      "Delete comment error:",
      error
    );

    res
      .status(500)
      .json({
        message:
          "Unable to delete comment"
      });
  }
}

/*
  VIEW STAT MAINTENANCE API

  Normal creation/update happens
  automatically when readers open
  published articles.

  These endpoints make the full CRUD
  contract explicit for maintenance
  and testing.
*/

async function listViewStats(
  req,
  res
) {
  try {
    const filter = {};

    const articleId =
      String(
        req.query.articleId || ""
      );

    if (articleId) {
      if (
        !mongoose.isValidObjectId(
          articleId
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid article ID"
          });
      }

      filter.article =
        articleId;
    }

    if (
      req.query.from ||
      req.query.to
    ) {
      filter.bucketStart =
        {};

      if (req.query.from) {
        const from =
          new Date(
            req.query.from
          );

        if (
          Number.isNaN(
            from.getTime()
          )
        ) {
          return res
            .status(400)
            .json({
              message:
                "Invalid from date"
            });
        }

        filter.bucketStart.$gte =
          from;
      }

      if (req.query.to) {
        const to =
          new Date(
            req.query.to
          );

        if (
          Number.isNaN(
            to.getTime()
          )
        ) {
          return res
            .status(400)
            .json({
              message:
                "Invalid to date"
            });
        }

        filter.bucketStart.$lte =
          to;
      }
    }

    const page =
      getPage(
        req.query.page
      );

    const limit =
      Math.min(
        Math.max(
          Number.parseInt(
            req.query.limit,
            10
          ) || 50,
          1
        ),
        100
      );

    const total =
      await ViewStat.countDocuments(
        filter
      );

    const stats =
      await ViewStat.find(
        filter
      )
        .populate(
          "article",
          "publishedVersion.title workingVersion.title"
        )
        .sort({
          bucketStart: -1
        })
        .skip(
          (
            page - 1
          ) *
          limit
        )
        .limit(limit)
        .lean();

    res.json({
      page,
      limit,
      total,

      totalPages:
        Math.max(
          Math.ceil(
            total /
            limit
          ),
          1
        ),

      stats
    });
  } catch (error) {
    console.error(
      "ViewStat list error:",
      error
    );

    res
      .status(500)
      .json({
        message:
          "Unable to load view statistics"
      });
  }
}

async function createViewStat(
  req,
  res
) {
  try {
    const articleId =
      String(
        req.body.articleId || ""
      );

    if (
      !mongoose.isValidObjectId(
        articleId
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid article ID"
        });
    }

    const articleExists =
      await Article.exists({
        _id:
          articleId
      });

    if (!articleExists) {
      return res
        .status(404)
        .json({
          message:
            "Article not found"
        });
    }

    const bucketStart =
      new Date(
        req.body.bucketStart
      );

    if (
      Number.isNaN(
        bucketStart.getTime()
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid bucket start date"
        });
    }

    const views =
      Number(
        req.body.views
      );

    if (
      !Number.isInteger(
        views
      ) ||
      views < 0
    ) {
      return res
        .status(400)
        .json({
          message:
            "Views must be a non-negative integer"
        });
    }

    const stat =
      await ViewStat.create({
        article:
          articleId,

        bucketStart,
        views
      });

    res
      .status(201)
      .json({
        message:
          "ViewStat created successfully",

        stat
      });
  } catch (error) {
    if (
      error &&
      error.code === 11000
    ) {
      return res
        .status(409)
        .json({
          message:
            "A ViewStat bucket already exists for this article and time"
        });
    }

    return handleValidationError(
      error,
      res,
      "Create ViewStat error:"
    );
  }
}

async function updateViewStat(
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
            "Invalid ViewStat ID"
        });
    }

    const stat =
      await ViewStat.findById(
        req.params.id
      );

    if (!stat) {
      return res
        .status(404)
        .json({
          message:
            "ViewStat not found"
        });
    }

    const views =
      Number(
        req.body.views
      );

    if (
      !Number.isInteger(
        views
      ) ||
      views < 0
    ) {
      return res
        .status(400)
        .json({
          message:
            "Views must be a non-negative integer"
        });
    }

    stat.views =
      views;

    await stat.save();

    res.json({
      message:
        "ViewStat updated successfully"
    });
  } catch (error) {
    return handleValidationError(
      error,
      res,
      "Update ViewStat error:"
    );
  }
}

async function deleteViewStat(
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
            "Invalid ViewStat ID"
        });
    }

    const stat =
      await ViewStat.findById(
        req.params.id
      );

    if (!stat) {
      return res
        .status(404)
        .json({
          message:
            "ViewStat not found"
        });
    }

    await stat.deleteOne();

    res.json({
      message:
        "ViewStat deleted successfully"
    });
  } catch (error) {
    console.error(
      "Delete ViewStat error:",
      error
    );

    res
      .status(500)
      .json({
        message:
          "Unable to delete ViewStat"
      });
  }
}

module.exports = {
  getUsersPage,
  createUser,
  updateUser,
  deleteUser,

  getCommentsPage,
  updateComment,
  deleteComment,

  listViewStats,
  createViewStat,
  updateViewStat,
  deleteViewStat
};