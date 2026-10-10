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

const MAX_SEARCH_LENGTH = 200;

const USER_LIMITS = {
  usernameMin: 3,
  usernameMax: 50,
  displayNameMax: 100,
  passwordMin: 8,
  passwordMax: 256
};

const COMMENT_LIMITS = {
  name: 80,
  text: 2000
};

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

function validateUserFields({
  username,
  displayName,
  password,
  requirePassword
}) {
  if (
    !username ||
    !displayName ||
    (
      requirePassword &&
      !password
    )
  ) {
    return requirePassword
      ? "Username, display name and password are required"
      : "Username and display name are required";
  }

  if (
    username.length <
      USER_LIMITS.usernameMin ||
    username.length >
      USER_LIMITS.usernameMax
  ) {
    return "Username must contain between 3 and 50 characters";
  }

  if (
    displayName.length >
    USER_LIMITS.displayNameMax
  ) {
    return "Display name is too long";
  }

  if (
    password &&
    (
      password.length <
        USER_LIMITS.passwordMin ||
      password.length >
        USER_LIMITS.passwordMax
    )
  ) {
    return "Password must contain between 8 and 256 characters";
  }

  return null;
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
      getSearchValue(
        req.query.search
      );

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
          username: 1,
          _id: 1
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

    return res.render(
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

    return res
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

    const validationError =
      validateUserFields({
        username,
        displayName,
        password,
        requirePassword:
          true
      });

    if (validationError) {
      return res
        .status(400)
        .json({
          message:
            validationError
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

    return res
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

    const validationError =
      validateUserFields({
        username,
        displayName,
        password,
        requirePassword:
          false
      });

    if (validationError) {
      return res
        .status(400)
        .json({
          message:
            validationError
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
          role:
            "editor"
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

    return res.json({
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
          role:
            "editor"
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

    return res.json({
      message:
        "User deleted successfully"
    });
  } catch (error) {
    console.error(
      "Delete user error:",
      error
    );

    return res
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
      getSearchValue(
        req.query.search
      );

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

    const sortDirection =
      sort === "oldest"
        ? 1
        : -1;

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
            sortDirection,

          _id:
            sortDirection
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

    return res.render(
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

    return res
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

    if (
      name.length >
      COMMENT_LIMITS.name
    ) {
      return res
        .status(400)
        .json({
          message:
            "Comment name is too long"
        });
    }

    if (
      text.length >
      COMMENT_LIMITS.text
    ) {
      return res
        .status(400)
        .json({
          message:
            "Comment text is too long"
        });
    }

    comment.name =
      name;

    comment.text =
      text;

    await comment.save();

    return res.json({
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

    return res.json({
      message:
        "Comment deleted successfully"
    });
  } catch (error) {
    console.error(
      "Delete comment error:",
      error
    );

    return res
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
      ).trim();

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

    let fromDate = null;
    let toDate = null;

    if (req.query.from) {
      fromDate =
        new Date(
          String(
            req.query.from
          )
        );

      if (
        Number.isNaN(
          fromDate.getTime()
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid from date"
          });
      }
    }

    if (req.query.to) {
      toDate =
        new Date(
          String(
            req.query.to
          )
        );

      if (
        Number.isNaN(
          toDate.getTime()
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              "Invalid to date"
          });
      }
    }

    if (
      fromDate &&
      toDate &&
      fromDate > toDate
    ) {
      return res
        .status(400)
        .json({
          message:
            "From date must be before or equal to to date"
        });
    }

    if (
      fromDate ||
      toDate
    ) {
      filter.bucketStart = {};

      if (fromDate) {
        filter
          .bucketStart
          .$gte =
          fromDate;
      }

      if (toDate) {
        filter
          .bucketStart
          .$lte =
          toDate;
      }
    }

    const requestedPage =
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
      await ViewStat
        .countDocuments(
          filter
        );

    const totalPages =
      Math.max(
        Math.ceil(
          total /
          limit
        ),
        1
      );

    const page =
      Math.min(
        requestedPage,
        totalPages
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
          bucketStart: -1,
          _id: -1
        })
        .skip(
          (
            page - 1
          ) *
          limit
        )
        .limit(
          limit
        )
        .lean();

    return res.json({
      page,
      limit,
      total,
      totalPages,
      stats
    });
  } catch (error) {
    console.error(
      "ViewStat list error:",
      error
    );

    return res
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
      ).trim();

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

    if (
      req.body.views ===
        undefined ||
      req.body.views ===
        null ||
      req.body.views ===
        ""
    ) {
      return res
        .status(400)
        .json({
          message:
            "Views are required"
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

    return res
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

    if (
      req.body.views ===
        undefined ||
      req.body.views ===
        null ||
      req.body.views ===
        ""
    ) {
      return res
        .status(400)
        .json({
          message:
            "Views are required"
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

    return res.json({
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

    return res.json({
      message:
        "ViewStat deleted successfully"
    });
  } catch (error) {
    console.error(
      "Delete ViewStat error:",
      error
    );

    return res
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