const mongoose =
  require("mongoose");

const crypto =
  require("crypto");

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

const DB_URL =
  process.env.MONGODB_URI;

const ARTICLE_COUNT = 520;

const FIVE_MINUTES =
  5 * 60 * 1000;

const HOUR =
  60 * 60 * 1000;

const SIX_HOURS =
  6 * HOUR;

const DAY =
  24 * HOUR;

const categories = [
  "Technology",
  "Business",
  "World",
  "Science",
  "Health",
  "Sports",
  "Culture",
  "Environment"
];

const topics = [
  {
    category: "Technology",
    title:
      "Artificial Intelligence Changes the Digital World",
    summary:
      "New artificial intelligence tools continue to influence technology and everyday life.",
    content:
      "Artificial intelligence continues to develop across many industries. Companies are introducing new tools while researchers study their impact, performance and practical uses."
  },

  {
    category: "Business",
    title:
      "Global Markets React to New Economic Trends",
    summary:
      "Businesses and investors are following new developments across global markets.",
    content:
      "Markets continue to respond to changing economic conditions. Companies are examining consumer demand, investment trends and new opportunities around the world."
  },

  {
    category: "World",
    title:
      "Cities Introduce New Urban Development Projects",
    summary:
      "Major cities are investing in transportation, infrastructure and public spaces.",
    content:
      "Urban development projects are changing transportation, housing and public spaces. Local authorities are examining ways to improve accessibility and quality of life."
  },

  {
    category: "Science",
    title:
      "Researchers Report New Scientific Discoveries",
    summary:
      "Scientists continue to make progress across several important research fields.",
    content:
      "Research teams are studying new technologies, materials and scientific processes. Their work may contribute to future developments in science and industry."
  },

  {
    category: "Health",
    title:
      "New Research Focuses on Healthy Daily Habits",
    summary:
      "Researchers are examining how everyday habits can influence long-term health.",
    content:
      "Health researchers continue to study exercise, sleep, nutrition and other daily habits. The research aims to better understand how lifestyle choices affect well-being."
  },

  {
    category: "Sports",
    title:
      "Teams Prepare for an Important New Season",
    summary:
      "Players and coaches are preparing for the next stage of competition.",
    content:
      "Sports teams are preparing through training, tactical planning and player development. Supporters are closely following preparations for the upcoming competitions."
  },

  {
    category: "Culture",
    title:
      "New Cultural Events Attract Growing Audiences",
    summary:
      "Music, film and art events are attracting audiences in cities around the world.",
    content:
      "Cultural events continue to attract visitors interested in music, film, art and performance. Organizers are also using digital platforms to reach wider audiences."
  },

  {
    category: "Environment",
    title:
      "Renewable Energy Projects Continue to Expand",
    summary:
      "New renewable energy projects are being developed in several regions.",
    content:
      "Energy companies and governments are continuing to invest in renewable power. Solar, wind and storage projects are playing a growing role in future energy planning."
  },

  {
    category: "Technology",
    title:
      "Electric Cars Continue to Grow",
    summary:
      "Electric vehicles continue to gain popularity as charging and battery technology improves.",
    content:
      "Electric vehicles are becoming increasingly common as manufacturers introduce new models with longer range, faster charging and improved technology."
  },

  {
    category: "Business",
    title:
      "Startups Explore New Digital Business Models",
    summary:
      "Technology startups are testing new products and services in competitive markets.",
    content:
      "Startup companies continue to experiment with software, digital services and new business models. Competition remains strong as companies search for sustainable growth."
  },

  {
    category: "Science",
    title:
      "Space Technology Reaches New Milestones",
    summary:
      "New missions and technologies are expanding scientific capabilities in space.",
    content:
      "Space organizations and private companies are developing new spacecraft, satellites and research systems. These projects are creating additional opportunities for exploration."
  },

  {
    category: "Sports",
    title:
      "Athletes Use Technology to Improve Performance",
    summary:
      "Modern training increasingly combines coaching with detailed performance data.",
    content:
      "Athletes and coaches are using sensors, video analysis and performance data to improve training. Technology is becoming an increasingly important part of professional sport."
  }
];

const commentTexts = [
  "Interesting article. Thanks for the update.",
  "This was useful and easy to understand.",
  "I would like to read more about this topic.",
  "Great summary of the latest developments.",
  "This is an interesting development to follow.",
  "Thanks for sharing the information.",
  "I did not know about this before.",
  "Looking forward to seeing what happens next."
];

function minutesAgo(minutes) {
  return new Date(
    Date.now() -
    minutes * 60 * 1000
  );
}

function hoursAgo(hours) {
  return new Date(
    Date.now() -
    hours * HOUR
  );
}

function daysAgo(days) {
  return new Date(
    Date.now() -
    days * DAY
  );
}

function deterministicNumber(
  seed,
  minimum,
  maximum
) {
  const value =
    Math.abs(
      (
        seed * 9301 +
        49297
      ) % 233280
    );

  return (
    minimum +
    (
      value %
      (
        maximum -
        minimum +
        1
      )
    )
  );
}

function createDemoPassword(
  prefix
) {
  const randomPart =
    crypto
      .randomBytes(5)
      .toString("hex");

  return (
    `${prefix}#` +
    `${randomPart}!`
  );
}

async function createDemoUser({
  username,
  displayName,
  role,
  password
}) {
  const {
    passwordHash,
    passwordSalt
  } = hashPassword(
    password
  );

  return User.create({
    username,
    displayName,
    role,
    passwordHash,
    passwordSalt
  });
}

function buildVersion(
  index,
  options = {}
) {
  const topic =
    topics[
      index %
      topics.length
    ];

  const articleNumber =
    index + 1;

  return {
    title:
      options.title ||
      (
        `${topic.title} ` +
        `#${articleNumber}`
      ),

    summary:
      options.summary ||
      topic.summary,

    content:
      options.content ||
      (
        topic.content +
        "\n\n" +
        `This demonstration article is number ${articleNumber} in The Web Daily dataset.`
      ),

    category:
      options.category ||
      topic.category,

    imageUrl:
      `https://picsum.photos/seed/web-daily-${articleNumber}/900/500`
  };
}

function cloneVersion(
  version
) {
  return {
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
}

function buildPublicationHistory(
  index,
  editorId,
  initialPublication
) {
  const history = [
    {
      publishedAt:
        initialPublication,

      editor:
        editorId
    }
  ];

  /*
    Several articles receive
    multiple publication events
    so the Analytics Impact
    markers are easy to demonstrate.
  */
  if (index === 0) {
    history.push(
      {
        publishedAt:
          hoursAgo(8),

        editor:
          editorId
      },

      {
        publishedAt:
          hoursAgo(2),

        editor:
          editorId
      }
    );
  } else if (index < 20) {
    history.push(
      {
        publishedAt:
          daysAgo(
            3 +
            (
              index %
              5
            )
          ),

        editor:
          editorId
      },

      {
        publishedAt:
          hoursAgo(
            8 +
            index
          ),

        editor:
          editorId
      }
    );
  } else if (index < 60) {
    history.push({
      publishedAt:
        daysAgo(
          2 +
          (
            index %
            10
          )
        ),

      editor:
        editorId
    });
  }

  return history
    .filter(
      event =>
        new Date(
          event.publishedAt
        ) >=
        new Date(
          initialPublication
        )
    )
    .sort(
      (
        first,
        second
      ) =>
        new Date(
          first.publishedAt
        ) -
        new Date(
          second.publishedAt
        )
    );
}

function createArticleDocument(
  index,
  reporters,
  editorId
) {
  const author =
    reporters[
      index %
      reporters.length
    ];

  const createdAt =
    daysAgo(
      1 +
      (
        index %
        150
      )
    );

  const version =
    buildVersion(index);

  if (index === 0) {
    const specialVersion =
      buildVersion(
        index,
        {
          title:
            "Electric Cars Continue to Grow",

          summary:
            "Electric vehicles continue to gain popularity around the world.",

          content:
            "Electric vehicles are becoming increasingly common as manufacturers introduce new models with longer range, faster charging and improved technology.",

          category:
            "Technology"
        }
      );

    const initialPublication =
      daysAgo(14);

    return {
      author:
        author._id,

      status:
        "published",

      workingVersion:
        cloneVersion(
          specialVersion
        ),

      publishedVersion:
        cloneVersion(
          specialVersion
        ),

      editorNote:
        "",

      publishedAt:
        initialPublication,

      publicationHistory:
        buildPublicationHistory(
          index,
          editorId,
          initialPublication
        ),

      totalViews:
        0,

      createdAt:
        daysAgo(20),

      updatedAt:
        hoursAgo(2)
    };
  }

  /*
    400 standard published
    articles.
  */
  if (index < 400) {
    const initialPublication =
      daysAgo(
        1 +
        (
          index %
          90
        )
      );

    const history =
      buildPublicationHistory(
        index,
        editorId,
        initialPublication
      );

    return {
      author:
        author._id,

      status:
        "published",

      workingVersion:
        cloneVersion(version),

      publishedVersion:
        cloneVersion(version),

      editorNote:
        "",

      publishedAt:
        initialPublication,

      publicationHistory:
        history,

      totalViews:
        0,

      createdAt,

      updatedAt:
        history[
          history.length - 1
        ].publishedAt
    };
  }

  /*
    45 drafts.
  */
  if (index < 445) {
    return {
      author:
        author._id,

      status:
        "draft",

      workingVersion:
        cloneVersion(version),

      publishedVersion:
        null,

      editorNote:
        "",

      publicationHistory:
        [],

      totalViews:
        0,

      createdAt,

      updatedAt:
        daysAgo(
          index % 7
        )
    };
  }

  /*
    40 pending articles.

    First 12 are revisions of
    articles that already have
    a public version.
  */
  if (index < 485) {
    const isRevision =
      index < 457;

    if (isRevision) {
      const oldVersion =
        buildVersion(
          index,
          {
            title:
              `${version.title} — Published Version`
          }
        );

      const newVersion =
        buildVersion(
          index,
          {
            title:
              `${version.title} — New Revision`
          }
        );

      const initialPublication =
        daysAgo(
          10 +
          (
            index %
            20
          )
        );

      return {
        author:
          author._id,

        status:
          "pending",

        workingVersion:
          newVersion,

        publishedVersion:
          oldVersion,

        editorNote:
          "",

        publishedAt:
          initialPublication,

        publicationHistory: [
          {
            publishedAt:
              initialPublication,

            editor:
              editorId
          }
        ],

        totalViews:
          0,

        createdAt:
          daysAgo(45),

        updatedAt:
          hoursAgo(
            index % 24
          )
      };
    }

    return {
      author:
        author._id,

      status:
        "pending",

      workingVersion:
        cloneVersion(version),

      publishedVersion:
        null,

      editorNote:
        "",

      publicationHistory:
        [],

      totalViews:
        0,

      createdAt,

      updatedAt:
        hoursAgo(
          index % 24
        )
    };
  }

  /*
    35 returned articles.

    First 10 are revisions of
    previously published articles.
  */
  const isRevision =
    index < 495;

  if (isRevision) {
    const oldVersion =
      buildVersion(
        index,
        {
          title:
            `${version.title} — Published Version`
        }
      );

    const newVersion =
      buildVersion(
        index,
        {
          title:
            `${version.title} — Revision Draft`
        }
      );

    const initialPublication =
      daysAgo(
        20 +
        (
          index %
          30
        )
      );

    return {
      author:
        author._id,

      status:
        "returned",

      workingVersion:
        newVersion,

      publishedVersion:
        oldVersion,

      editorNote:
        "Please clarify the updated information and review the article before submitting it again.",

      publishedAt:
        initialPublication,

      publicationHistory: [
        {
          publishedAt:
            initialPublication,

          editor:
            editorId
        }
      ],

      totalViews:
        0,

      createdAt:
        daysAgo(60),

      updatedAt:
        hoursAgo(
          index % 48
        )
    };
  }

  return {
    author:
      author._id,

    status:
      "returned",

    workingVersion:
      cloneVersion(version),

    publishedVersion:
      null,

    editorNote:
      "Please improve the summary and add more detail before submitting again.",

    publicationHistory:
      [],

    totalViews:
      0,

    createdAt,

    updatedAt:
      hoursAgo(
        index % 48
      )
  };
}

function floorToStep(
  date,
  stepMs
) {
  return new Date(
    Math.floor(
      date.getTime() /
      stepMs
    ) *
    stepMs
  );
}

function ceilToStep(
  date,
  stepMs
) {
  return new Date(
    Math.ceil(
      date.getTime() /
      stepMs
    ) *
    stepMs
  );
}

function getPublicationBoost(
  bucketDate,
  bucketSize,
  publicationHistory,
  articleIndex
) {
  let boost = 0;

  for (
    let eventIndex = 0;
    eventIndex <
      publicationHistory.length;
    eventIndex += 1
  ) {
    const publicationTime =
      new Date(
        publicationHistory[
          eventIndex
        ].publishedAt
      ).getTime();

    const difference =
      bucketDate.getTime() -
      publicationTime;

    /*
      Traffic spike during the
      first four hours after a
      publication or update.
    */
    if (
      difference >=
        -bucketSize &&
      difference <=
        4 * HOUR
    ) {
      const scale =
        Math.max(
          1,
          bucketSize /
          FIVE_MINUTES
        );

      boost +=
        deterministicNumber(
          (
            articleIndex + 1
          ) *
          (
            eventIndex + 11
          ) +
          Math.floor(
            bucketDate.getTime() /
            FIVE_MINUTES
          ),
          4,
          12
        ) *
        scale;
    }
  }

  return boost;
}

function getTrafficViews(
  articleIndex,
  bucketDate,
  bucketSize,
  publicationHistory
) {
  const hour =
    bucketDate.getHours();

  const popularity =
    1 +
    (
      articleIndex %
      8
    );

  const scale =
    Math.max(
      1,
      bucketSize /
      FIVE_MINUTES
    );

  const seed =
    (
      articleIndex + 1
    ) *
    100003 +
    Math.floor(
      bucketDate.getTime() /
      FIVE_MINUTES
    );

  let basePerFiveMinutes =
    deterministicNumber(
      seed,
      0,
      2 +
      popularity
    );

  /*
    Make occasional quiet
    five-minute periods.
  */
  if (
    bucketSize ===
      FIVE_MINUTES &&
    deterministicNumber(
      seed + 17,
      0,
      5
    ) === 0
  ) {
    basePerFiveMinutes =
      0;
  }

  let timeFactor =
    0.65;

  if (
    hour >= 7 &&
    hour < 12
  ) {
    timeFactor =
      1.0;
  } else if (
    hour >= 12 &&
    hour < 18
  ) {
    timeFactor =
      1.25;
  } else if (
    hour >= 18 &&
    hour <= 23
  ) {
    timeFactor =
      1.45;
  }

  const normalTraffic =
    Math.round(
      basePerFiveMinutes *
      scale *
      timeFactor
    );

  const publicationBoost =
    getPublicationBoost(
      bucketDate,
      bucketSize,
      publicationHistory,
      articleIndex
    );

  return (
    normalTraffic +
    publicationBoost
  );
}

function generateAnalyticsForArticle(
  article,
  articleIndex
) {
  const documents = [];

  const now =
    new Date();

  const endFiveMinutes =
    floorToStep(
      now,
      FIVE_MINUTES
    );

  const oneDayAgo =
    new Date(
      now.getTime() -
      DAY
    );

  const sevenDaysAgo =
    new Date(
      now.getTime() -
      7 * DAY
    );

  const thirtyDaysAgo =
    new Date(
      now.getTime() -
      30 * DAY
    );

  const publicationDate =
    article.publishedAt
      ? new Date(
          article.publishedAt
        )
      : thirtyDaysAgo;

  const history =
    article.publicationHistory ||
    [];

  let totalViews = 0;

  /*
    7-30 days ago:
    one aggregated bucket
    every 6 hours.
  */
  const oldStartDate =
    publicationDate >
      thirtyDaysAgo
      ? publicationDate
      : thirtyDaysAgo;

  let oldStart =
    ceilToStep(
      oldStartDate,
      SIX_HOURS
    );

  const oldEnd =
    floorToStep(
      sevenDaysAgo,
      SIX_HOURS
    );

  for (
    let time =
      oldStart.getTime();

    time <
      oldEnd.getTime();

    time +=
      SIX_HOURS
  ) {
    const bucketDate =
      new Date(time);

    const views =
      getTrafficViews(
        articleIndex,
        bucketDate,
        SIX_HOURS,
        history
      );

    if (views > 0) {
      documents.push({
        article:
          article._id,

        bucketStart:
          bucketDate,

        views
      });

      totalViews +=
        views;
    }
  }

  /*
    1-7 days ago:
    hourly buckets.
  */
  const middleStartDate =
    publicationDate >
      sevenDaysAgo
      ? publicationDate
      : sevenDaysAgo;

  const middleStart =
    ceilToStep(
      middleStartDate,
      HOUR
    );

  const middleEnd =
    floorToStep(
      oneDayAgo,
      HOUR
    );

  for (
    let time =
      middleStart.getTime();

    time <
      middleEnd.getTime();

    time +=
      HOUR
  ) {
    const bucketDate =
      new Date(time);

    const views =
      getTrafficViews(
        articleIndex,
        bucketDate,
        HOUR,
        history
      );

    if (views > 0) {
      documents.push({
        article:
          article._id,

        bucketStart:
          bucketDate,

        views
      });

      totalViews +=
        views;
    }
  }

  /*
    Last 24 hours:
    detailed 5-minute buckets.
  */
  const recentStartDate =
    publicationDate >
      oneDayAgo
      ? publicationDate
      : oneDayAgo;

  const recentStart =
    ceilToStep(
      recentStartDate,
      FIVE_MINUTES
    );

  for (
    let time =
      recentStart.getTime();

    time <=
      endFiveMinutes.getTime();

    time +=
      FIVE_MINUTES
  ) {
    const bucketDate =
      new Date(time);

    const views =
      getTrafficViews(
        articleIndex,
        bucketDate,
        FIVE_MINUTES,
        history
      );

    if (views > 0) {
      documents.push({
        article:
          article._id,

        bucketStart:
          bucketDate,

        views
      });

      totalViews +=
        views;
    }
  }

  /*
    Represents older historical
    traffic not included in the
    detailed 30-day graph.
  */
  const olderHistoricalViews =
    deterministicNumber(
      articleIndex + 5000,
      100,
      8000
    );

  return {
    documents,

    totalViews:
      totalViews +
      olderHistoricalViews
  };
}

async function insertInChunks(
  Model,
  documents,
  chunkSize = 5000
) {
  for (
    let index = 0;
    index <
      documents.length;
    index +=
      chunkSize
  ) {
    const chunk =
      documents.slice(
        index,
        index +
        chunkSize
      );

    await Model.insertMany(
      chunk,
      {
        ordered: false
      }
    );
  }
}

async function seed() {
  try {
    // Refuse to connect or delete anything until the caller explicitly names
    // the same target twice. There is intentionally no default seed database.
    if (!DB_URL) throw new Error("Set MONGODB_URI and SEED_CONFIRM_DATABASE explicitly.");
    const parsed = new URL(DB_URL);
    const databaseName = decodeURIComponent(parsed.pathname.slice(1));
    if (!["mongodb:", "mongodb+srv:"].includes(parsed.protocol) ||
        !databaseName || databaseName.includes("/") ||
        ["admin", "local", "config"].includes(databaseName) ||
        process.env.SEED_CONFIRM_DATABASE !== databaseName) {
      throw new Error("Seed refused: SEED_CONFIRM_DATABASE must exactly match the URI database name.");
    }
    console.log(`Seed target database: ${databaseName} (all existing demo data will be replaced)`);
    await mongoose.connect(DB_URL);

    console.log(
      "Connected to MongoDB"
    );

    console.log(
      "Clearing existing demo data..."
    );

    await Promise.all([
      ViewStat.deleteMany({}),
      Comment.deleteMany({}),
      Article.deleteMany({}),
      User.deleteMany({})
    ]);

    const credentials = {
      editor:
        createDemoPassword(
          "EditorDemo"
        ),

      reporter1:
        createDemoPassword(
          "ReporterOne"
        ),

      reporter2:
        createDemoPassword(
          "ReporterTwo"
        ),

      reporter3:
        createDemoPassword(
          "ReporterThree"
        ),

      reporter4:
        createDemoPassword(
          "ReporterFour"
        ),

      reporter5:
        createDemoPassword(
          "ReporterFive"
        )
    };

    const editor =
      await createDemoUser({
        username:
          "editor",

        displayName:
          "Daniel Cohen",

        role:
          "editor",

        password:
          credentials.editor
      });

    const reporters = [];

    reporters.push(
      await createDemoUser({
        username:
          "reporter1",

        displayName:
          "Maya Levi",

        role:
          "reporter",

        password:
          credentials.reporter1
      })
    );

    reporters.push(
      await createDemoUser({
        username:
          "reporter2",

        displayName:
          "Noam Shalev",

        role:
          "reporter",

        password:
          credentials.reporter2
      })
    );

    reporters.push(
      await createDemoUser({
        username:
          "reporter3",

        displayName:
          "Dana Amir",

        role:
          "reporter",

        password:
          credentials.reporter3
      })
    );

    reporters.push(
      await createDemoUser({
        username:
          "reporter4",

        displayName:
          "Yonatan Bar",

        role:
          "reporter",

        password:
          credentials.reporter4
      })
    );

    reporters.push(
      await createDemoUser({
        username:
          "reporter5",

        displayName:
          "Lior Cohen",

        role:
          "reporter",

        password:
          credentials.reporter5
      })
    );

    console.log(
      "Creating 520 articles..."
    );

    const articleDocuments = [];

    for (
      let index = 0;
      index <
        ARTICLE_COUNT;
      index += 1
    ) {
      articleDocuments.push(
        createArticleDocument(
          index,
          reporters,
          editor._id
        )
      );
    }

    const articles =
      await Article.insertMany(
        articleDocuments
      );

    const publicArticles =
      articles.filter(
        article =>
          article.publishedVersion
      );

    console.log(
      "Creating comments..."
    );

    const comments = [];

    const commentArticles =
      publicArticles.slice(
        0,
        220
      );

    commentArticles.forEach(
      (
        article,
        articleIndex
      ) => {
        const numberOfComments =
          deterministicNumber(
            articleIndex,
            2,
            7
          );

        for (
          let commentIndex = 0;
          commentIndex <
            numberOfComments;
          commentIndex += 1
        ) {
          const ageInHours =
            deterministicNumber(
              articleIndex * 20 +
              commentIndex,
              1,
              500
            );

          comments.push({
            article:
              article._id,

            name:
              `Reader ${
                (
                  articleIndex +
                  commentIndex
                ) %
                80 +
                1
              }`,

            text:
              commentTexts[
                (
                  articleIndex +
                  commentIndex
                ) %
                commentTexts.length
              ],

            deviceIdentifier:
              `seed-device-${
                (
                  articleIndex *
                  7 +
                  commentIndex
                ) %
                300
              }`,

            createdAt:
              hoursAgo(
                ageInHours
              ),

            updatedAt:
              hoursAgo(
                ageInHours
              )
          });
        }
      }
    );

    await Comment.insertMany(
      comments
    );

    console.log(
      `Creating analytics history for ${publicArticles.length} public articles...`
    );

    const viewStats = [];

    const viewUpdates = [];

    for (
      let articleIndex = 0;
      articleIndex <
        publicArticles.length;
      articleIndex += 1
    ) {
      const article =
        publicArticles[
          articleIndex
        ];

      const analytics =
        generateAnalyticsForArticle(
          article,
          articleIndex
        );

      viewStats.push(
        ...analytics.documents
      );

      viewUpdates.push({
        updateOne: {
          filter: {
            _id:
              article._id
          },

          update: {
            $set: {
              totalViews:
                analytics.totalViews
            }
          }
        }
      });

      if (
        (
          articleIndex + 1
        ) %
        50 === 0
      ) {
        console.log(
          `Prepared analytics for ${articleIndex + 1}/${publicArticles.length} articles`
        );
      }
    }

    console.log(
      `Writing ${viewStats.length} ViewStat buckets...`
    );

    await insertInChunks(
      ViewStat,
      viewStats,
      5000
    );

    await Article.bulkWrite(
      viewUpdates
    );

    console.log("");
    console.log(
      "Seed completed successfully."
    );
    console.log("");

    console.log(
      "=========================================="
    );

    console.log(
      "DEMO LOGIN CREDENTIALS"
    );

    console.log(
      "=========================================="
    );

    console.log(
      `editor    | ${credentials.editor}`
    );

    console.log(
      `reporter1 | ${credentials.reporter1}`
    );

    console.log(
      `reporter2 | ${credentials.reporter2}`
    );

    console.log(
      `reporter3 | ${credentials.reporter3}`
    );

    console.log(
      `reporter4 | ${credentials.reporter4}`
    );

    console.log(
      `reporter5 | ${credentials.reporter5}`
    );

    console.log(
      "=========================================="
    );

    console.log("");

    console.log(
      `Users: ${reporters.length + 1}`
    );

    console.log(
      `Articles: ${articles.length}`
    );

    console.log(
      `Publicly visible articles: ${publicArticles.length}`
    );

    console.log(
      `Comments: ${comments.length}`
    );

    console.log(
      `ViewStat buckets: ${viewStats.length}`
    );

    console.log("");

    console.log(
      "Article status distribution:"
    );

    console.log(
      "Published: 400"
    );

    console.log(
      "Draft: 45"
    );

    console.log(
      "Pending: 40"
    );

    console.log(
      "Returned: 35"
    );
  } catch (error) {
    console.error(
      "Seed failed:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    await mongoose
      .connection
      .close();

    console.log(
      "MongoDB connection closed"
    );
  }
}

seed();