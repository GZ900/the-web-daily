"use strict";

(function () {
  const STORAGE_KEY =
    "webDailyTheme";

  const root =
    document.documentElement;

  function getSystemTheme() {
    return window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches
      ? "dark"
      : "light";
  }

  function getStoredTheme() {
    try {
      const value =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (
        value === "light" ||
        value === "dark"
      ) {
        return value;
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  function applyTheme(theme) {
    root.dataset.theme =
      theme;

    root.style.colorScheme =
      theme;
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        theme
      );
    } catch (error) {
      /*
        The theme can still work
        even if storage is unavailable.
      */
    }
  }

  applyTheme(
    getStoredTheme() ||
    getSystemTheme()
  );

  document.addEventListener(
    "DOMContentLoaded",
    function () {
      const themeButton =
        document.querySelector(
          "#theme-toggle"
        );

      const menuButton =
        document.querySelector(
          "#menu-toggle"
        );

      const mobileNavigation =
        document.querySelector(
          "#mobile-navigation"
        );

      function updateThemeButton() {
        if (!themeButton) {
          return;
        }

        const isDark =
          root.dataset.theme ===
          "dark";

        themeButton.setAttribute(
          "aria-label",
          isDark
            ? "Switch to light mode"
            : "Switch to dark mode"
        );
      }

      function closeMenu() {
        if (
          !menuButton ||
          !mobileNavigation
        ) {
          return;
        }

        mobileNavigation.hidden =
          true;

        menuButton.setAttribute(
          "aria-expanded",
          "false"
        );

        menuButton.classList.remove(
          "menu-toggle-open"
        );
      }

      updateThemeButton();

      if (themeButton) {
        themeButton.addEventListener(
          "click",
          function () {
            const nextTheme =
              root.dataset.theme ===
              "dark"
                ? "light"
                : "dark";

            applyTheme(
              nextTheme
            );

            saveTheme(
              nextTheme
            );

            updateThemeButton();
          }
        );
      }

      if (
        menuButton &&
        mobileNavigation
      ) {
        menuButton.addEventListener(
          "click",
          function () {
            const willOpen =
              mobileNavigation.hidden;

            mobileNavigation.hidden =
              !willOpen;

            menuButton.setAttribute(
              "aria-expanded",
              String(willOpen)
            );

            menuButton.classList.toggle(
              "menu-toggle-open",
              willOpen
            );
          }
        );

        mobileNavigation
          .querySelectorAll("a")
          .forEach(
            link => {
              link.addEventListener(
                "click",
                closeMenu
              );
            }
          );

        document.addEventListener(
          "keydown",
          function (event) {
            if (
              event.key === "Escape"
            ) {
              closeMenu();
            }
          }
        );

        window.addEventListener(
          "resize",
          function () {
            if (
              window.innerWidth >
              860
            ) {
              closeMenu();
            }
          }
        );
      }

      const mediaQuery =
        window.matchMedia(
          "(prefers-color-scheme: dark)"
        );

      mediaQuery.addEventListener?.(
        "change",
        function (event) {
          if (
            getStoredTheme()
          ) {
            return;
          }

          applyTheme(
            event.matches
              ? "dark"
              : "light"
          );

          updateThemeButton();
        }
      );
    }
  );
})();