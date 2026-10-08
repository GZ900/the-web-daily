const mongoose = require("mongoose");

const User = require("../models/User");
const Article = require("../models/Article");
const Comment = require("../models/Comment");
const ViewStat = require("../models/ViewStat");

const { hashPassword } = require("../services/passwordService");

const DB_URL = "mongodb://127.0.0.1:27017/the-web-daily";

async function seedDatabase() {
  try {
    await mongoose.connect(DB_URL);

    console.log("Connected to MongoDB for seeding");

    await ViewStat.deleteMany({});
    await Comment.deleteMany({});
    await Article.deleteMany({});
    await User.deleteMany({});

    const editorPassword = hashPassword("[REDACTED_INACTIVE_DEMO_PASSWORD_1]");
    const reporterPassword = hashPassword("[REDACTED_INACTIVE_DEMO_PASSWORD_2]");

    const editor = await User.create({
      username: "editor",
      displayName: "Daniel Cohen",
      passwordHash: editorPassword.passwordHash,
      passwordSalt: editorPassword.passwordSalt,
      role: "editor"
    });

    const reporter1 = await User.create({
      username: "reporter1",
      displayName: "Maya Levi",
      passwordHash: reporterPassword.passwordHash,
      passwordSalt: reporterPassword.passwordSalt,
      role: "reporter"
    });

    const reporter2 = await User.create({
      username: "reporter2",
      displayName: "Noam Shalev",
      passwordHash: reporterPassword.passwordHash,
      passwordSalt: reporterPassword.passwordSalt,
      role: "reporter"
    });

    const now = new Date();

    const article1 = await Article.create({
      author: reporter1._id,
      status: "published",

      workingVersion: {
        title: "Electric Cars Continue to Grow",
        summary: "Electric vehicles continue to gain popularity around the world.",
        content:
          "Electric vehicles are becoming increasingly common as manufacturers introduce new models with longer range, faster charging and improved technology.",
        category: "Technology",
        imageUrl: ""
      },

      publishedVersion: {
        title: "Electric Cars Continue to Grow",
        summary: "Electric vehicles continue to gain popularity around the world.",
        content:
          "Electric vehicles are becoming increasingly common as manufacturers introduce new models with longer range, faster charging and improved technology.",
        category: "Technology",
        imageUrl: ""
      },

      publishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),

      publicationHistory: [
        {
          publishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          editor: editor._id
        }
      ],

      totalViews: 245
    });

    const article2 = await Article.create({
      author: reporter2._id,
      status: "published",

      workingVersion: {
        title: "New Advances in Artificial Intelligence",
        summary: "AI systems continue to improve across many fields.",
        content:
          "Artificial intelligence is being integrated into software, research, transportation and many other areas.",
        category: "Technology",
        imageUrl: ""
      },

      publishedVersion: {
        title: "New Advances in Artificial Intelligence",
        summary: "AI systems continue to improve across many fields.",
        content:
          "Artificial intelligence is being integrated into software, research, transportation and many other areas.",
        category: "Technology",
        imageUrl: ""
      },

      publishedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),

      publicationHistory: [
        {
          publishedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
          editor: editor._id
        }
      ],

      totalViews: 412
    });

    await Article.create({
      author: reporter1._id,
      status: "draft",

      workingVersion: {
        title: "Future Transportation",
        summary: "A look at new transportation technologies.",
        content:
          "This article is still being written and should not be visible to the public.",
        category: "Transport",
        imageUrl: ""
      }
    });

    await Article.create({
      author: reporter2._id,
      status: "pending",

      workingVersion: {
        title: "The Future of Web Development",
        summary: "Modern web development continues to evolve.",
        content:
          "This article is waiting for editor approval.",
        category: "Technology",
        imageUrl: ""
      }
    });

    await Comment.create([
      {
        article: article1._id,
        name: "David",
        text: "Interesting article about electric vehicles.",
        deviceIdentifier: "seed-device-1"
      },
      {
        article: article1._id,
        name: "Sarah",
        text: "I would like to see more information about charging times.",
        deviceIdentifier: "seed-device-2"
      },
      {
        article: article2._id,
        name: "Alex",
        text: "AI is developing incredibly quickly.",
        deviceIdentifier: "seed-device-3"
      }
    ]);

    const hour = 60 * 60 * 1000;

    await ViewStat.create([
      {
        article: article1._id,
        bucketStart: new Date(now.getTime() - 3 * hour),
        views: 42
      },
      {
        article: article1._id,
        bucketStart: new Date(now.getTime() - 2 * hour),
        views: 78
      },
      {
        article: article1._id,
        bucketStart: new Date(now.getTime() - hour),
        views: 125
      },
      {
        article: article2._id,
        bucketStart: new Date(now.getTime() - 3 * hour),
        views: 88
      },
      {
        article: article2._id,
        bucketStart: new Date(now.getTime() - 2 * hour),
        views: 137
      },
      {
        article: article2._id,
        bucketStart: new Date(now.getTime() - hour),
        views: 187
      }
    ]);

    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Seed error:", error);
  } finally {
    await mongoose.connection.close();
  }
}

seedDatabase();