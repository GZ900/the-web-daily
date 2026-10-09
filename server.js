const express = require("express");
const path = require("path");

const connectDB = require("./config/db");

const publicRoutes = require("./routes/publicRoutes");
const apiRoutes = require("./routes/apiRoutes");
const authRoutes = require("./routes/authRoutes");
const reporterRoutes = require("./routes/reporterRoutes");
const editorRoutes = require("./routes/editorRoutes");

const deviceIdentifier =
  require("./middleware/deviceIdentifier");

const {
  attachCurrentUser
} = require("./middleware/auth");

const app = express();

const PORT =
  process.env.PORT || 3001;

app.set("view engine", "ejs");

app.set(
  "views",
  path.join(__dirname, "views")
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

app.use(deviceIdentifier);

app.use(attachCurrentUser);

app.use("/", publicRoutes);
app.use("/", authRoutes);

app.use("/api", apiRoutes);

app.use("/reporter", reporterRoutes);
app.use("/editor", editorRoutes);

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(
      `Server is running on http://localhost:${PORT}`
    );
  });
}

startServer();