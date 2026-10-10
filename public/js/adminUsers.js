"use strict";

const createUserForm =
  document.querySelector(
    "#create-user-form"
  );

const createUserMessage =
  document.querySelector(
    "#create-user-message"
  );

if (createUserForm) {
  createUserForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      createUserMessage
        .textContent =
          "Creating...";

      const body = {
        username:
          document
            .querySelector(
              "#new-username"
            )
            .value
            .trim(),

        displayName:
          document
            .querySelector(
              "#new-display-name"
            )
            .value
            .trim(),

        password:
          document
            .querySelector(
              "#new-password"
            )
            .value,

        role:
          document
            .querySelector(
              "#new-role"
            )
            .value
      };

      try {
        const response =
          await fetch(
            "/api/editor/users",
            {
              method: "POST",

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

        if (!response.ok) {
          createUserMessage
            .textContent =
              data.message ||
              "Unable to create user";

          return;
        }

        window.location.reload();
      } catch (error) {
        console.error(
          error
        );

        createUserMessage
          .textContent =
            "Unable to connect to the server";
      }
    }
  );
}

document.addEventListener(
  "click",
  async event => {
    const saveButton =
      event.target.closest(
        ".save-user"
      );

    const deleteButton =
      event.target.closest(
        ".delete-user"
      );

    if (
      !saveButton &&
      !deleteButton
    ) {
      return;
    }

    const card =
      event.target.closest(
        ".user-card"
      );

    const userId =
      card.dataset.userId;

    const message =
      card.querySelector(
        ".user-message"
      );

    if (saveButton) {
      message.textContent =
        "Saving...";

      const body = {
        username:
          card
            .querySelector(
              ".user-username"
            )
            .value
            .trim(),

        displayName:
          card
            .querySelector(
              ".user-display-name"
            )
            .value
            .trim(),

        role:
          card
            .querySelector(
              ".user-role"
            )
            .value,

        password:
          card
            .querySelector(
              ".user-password"
            )
            .value
      };

      try {
        const response =
          await fetch(
            `/api/editor/users/${userId}`,
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

        if (response.ok) {
          card
            .querySelector(
              ".user-password"
            )
            .value =
              "";
        }
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
          "Delete this user?"
        );

      if (!confirmed) {
        return;
      }

      try {
        const response =
          await fetch(
            `/api/editor/users/${userId}`,
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
            "Unable to delete user";

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