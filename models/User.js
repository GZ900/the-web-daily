const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true
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
      lowercase: true
    },

    displayName: {
      type: String,
      required: true,
      trim: true
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
      enum: ["reporter", "editor"],
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

module.exports = mongoose.model("User", userSchema);