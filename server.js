const express =
  require("express");

const path =
  require("path");

const connectDB =
  require("./config/db");

const publicRoutes =
  require(
    "./routes/publicRoutes"
  );

const apiRoutes =
  require(
    "./routes/apiRoutes"
  );

const authRoutes =
  require(
    "./routes/authRoutes"
  );

const reporterRoutes =
  require(
    "./routes/reporterRoutes"
  );

const editorRoutes =
  require(
    "./routes/editorRoutes"
  );

const deviceIdentifier =
  require(
    "./middleware/deviceIdentifier"
  );

const {
  attachCurrentUser
} =
  require(
    "./middleware/auth"
  );

const app =
  express();

const PORT =
  process.env.PORT ||
  3001;

app.disable(
  "x-powered-by"
);

app.set(
  "view engine",
  "ejs"
);

app.set(
  "views",
  path.join(
    __dirname,
    "views"
  )
);

app.use(
  express.json({
    limit: "1mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb"
  })
);

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);

app.use(
  deviceIdentifier
);

app.use(
  attachCurrentUser
);

app.use(
  "/",
  publicRoutes
);

app.use(
  "/",
  authRoutes
);

app.use(
  "/api",
  apiRoutes
);

app.use(
  "/reporter",
  reporterRoutes
);

app.use(
  "/editor",
  editorRoutes
);

/*
  Route not found.
*/
app.use(
  (
    req,
    res
  ) => {
    if (
      req.originalUrl
        .startsWith(
          "/api/"
        )
    ) {
      return res
        .status(404)
        .json({
          message:
            "API route not found"
        });
    }

    return res
      .status(404)
      .send(
        "Page not found"
      );
  }
);

/*
  Final error handler.
*/
app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Unhandled request error:",
      error
    );

    if (
      res.headersSent
    ) {
      return next(
        error
      );
    }

    if (
      req.originalUrl
        .startsWith(
          "/api/"
        )
    ) {
      return res
        .status(500)
        .json({
          message:
            "Internal Server Error"
        });
    }

    return res
      .status(500)
      .send(
        "Internal Server Error"
      );
  }
);

async function startServer() {
  try {
    await connectDB();

    app.listen(
      PORT,
      () => {
        console.log(
          `Server is running on http://localhost:${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "Unable to start server:",
      error
    );

    process.exit(1);
  }
}

startServer();