"use strict";

document.addEventListener(
  "click",
  async event => {
    const saveButton =
      event.target.closest(
        ".save-comment"
      );

    const deleteButton =
      event.target.closest(
        ".delete-comment"
      );

    if (
      !saveButton &&
      !deleteButton
    ) {
      return;
    }

    const card =
      event.target.closest(
        ".comment-card"
      );

    const commentId =
      card.dataset.commentId;

    const message =
      card.querySelector(
        ".comment-message"
      );

    if (saveButton) {
      message.textContent =
        "Saving...";

      const body = {
        name:
          card
            .querySelector(
              ".comment-name"
            )
            .value
            .trim(),

        text:
          card
            .querySelector(
              ".comment-text"
            )
            .value
            .trim()
      };

      try {
        const response =
          await fetch(
            `/api/editor/comments/${commentId}`,
            {
              method:
                "PATCH",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  body
                )
            }
          );

        const data =
          await response.json();

        message.textContent =
          data.message ||
          (
            response.ok
              ? "Saved"
              : "Unable to save"
          );
      } catch (error) {
        console.error(
          error
        );

        message.textContent =
          "Unable to connect to the server";
      }
    }

    if (deleteButton) {
      const confirmed =
        window.confirm(
          "Delete this comment?"
        );

      if (!confirmed) {
        return;
      }

      try {
        const response =
          await fetch(
            `/api/editor/comments/${commentId}`,
            {
              method:
                "DELETE"
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          message.textContent =
            data.message ||
            "Unable to delete comment";

          return;
        }

        card.remove();
      } catch (error) {
        console.error(
          error
        );

        message.textContent =
          "Unable to connect to the server";
      }
    }
  }
);