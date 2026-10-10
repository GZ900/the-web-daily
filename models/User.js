const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      minlength: 64,
      maxlength: 64
    },

    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    _id: false
  }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 50
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    },

    passwordHash: {
      type: String,
      required: true,
      select: false
    },

    passwordSalt: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: [
        "reporter",
        "editor"
      ],
      required: true
    },

    sessions: {
      type: [sessionSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

/*
  Authentication searches by the
  hashed session token.

  Do not use a TTL index on
  sessions.expiresAt because sessions
  are embedded inside the User document.
*/
userSchema.index({
  "sessions.tokenHash": 1
});

userSchema.index({
  role: 1
});

module.exports =
  mongoose.model(
    "User",
    userSchema
  );