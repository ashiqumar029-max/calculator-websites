
/* =========================================
   VAULT — Private Space
   Password-gated private notes application
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector) => document.querySelector(selector);

  const setupScreen = $("#setupScreen");
  const lockScreen = $("#lockScreen");
  const vaultScreen = $("#vaultScreen");

  const setupForm = $("#setupForm");
  const unlockForm = $("#unlockForm");

  const setupCode = $("#setupCode");
  const confirmCode = $("#confirmCode");
  const accessCode = $("#accessCode");

  const notesArea = $("#notesArea");
  const lockButton = $("#lockButton");
  const saveStatus = $("#saveStatus");
  const toggleCodeButtons = document.querySelectorAll("[data-toggle-code]");

  const STORAGE = {
    code: "vault_access_code",
    notes: "vault_private_notes",
    configured: "vault_configured"
  };

  let failedAttempts = 0;
  let isLockedOut = false;
  let lockoutTimer = null;
  let saveTimer = null;

  // Show a screen and hide the others.
  function showScreen(screen) {
    [setupScreen, lockScreen, vaultScreen].forEach((element) => {
      if (element) element.hidden = true;
    });

    if (screen) screen.hidden = false;
  }

  // Update the message shown to the user.
  function showStatus(message, type = "info") {
    const statusElement =
      $("#statusMessage") || $("#lockMessage") || saveStatus;

    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.dataset.type = type;
  }

  // Check whether the vault has been configured.
  function isConfigured() {
    return localStorage.getItem(STORAGE.configured) === "true" &&
      Boolean(localStorage.getItem(STORAGE.code));
  }

  // Initial app state.
  function initializeVault() {
    if (isConfigured()) {
      showScreen(lockScreen);
    } else {
      showScreen(setupScreen);
    }
  }

  // Set the first access code.
  if (setupForm) {
    setupForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const code = setupCode?.value.trim() || "";
      const confirmation = confirmCode?.value.trim() || "";

      if (code.length < 4) {
        showStatus("Access code must be at least 4 characters.", "error");
        setupCode?.focus();
        return;
      }

      if (code !== confirmation) {
        showStatus("The access codes do not match.", "error");
        confirmCode?.focus();
        return;
      }

      localStorage.setItem(STORAGE.code, code);
      localStorage.setItem(STORAGE.notes, "");
      localStorage.setItem(STORAGE.configured, "true");

      if (setupCode) setupCode.value = "";
      if (confirmCode) confirmCode.value = "";

      showScreen(lockScreen);
      showStatus("Vault created. Enter your code to unlock.", "success");
      accessCode?.focus();
    });
  }

  // Unlock the vault.
  if (unlockForm) {
    unlockForm.addEventListener("submit", (event) => {
      event.preventDefault();

      if (isLockedOut) {
        showStatus("Too many attempts. Please wait a moment.", "error");
        return;
      }

      const enteredCode = accessCode?.value.trim() || "";
      const savedCode = localStorage.getItem(STORAGE.code);

      if (!enteredCode) {
        showStatus("Enter your access code first.", "error");
        accessCode?.focus();
        return;
      }

      if (enteredCode === savedCode) {
        failedAttempts = 0;

        if (accessCode) accessCode.value = "";

        openVault();
      } else {
        failedAttempts++;

        const remaining = 5 - failedAttempts;

        if (failedAttempts >= 5) {
          startLockout();
        } else {
          showStatus(
            `Incorrect code. ${remaining} attempt(s) remaining.`,
            "error"
          );
        }

        if (accessCode) {
          accessCode.value = "";
          accessCode.focus();
        }
      }
    });
  }

  // Open and load the private notes.
  function openVault() {
    showScreen(vaultScreen);

    if (notesArea) {
      notesArea.value = localStorage.getItem(STORAGE.notes) || "";
      notesArea.focus();
    }

    showStatus("Vault unlocked.", "success");
  }

  // Lock the vault after too many failed attempts.
  function startLockout() {
    isLockedOut = true;
    let secondsLeft = 30;

    showStatus(
      `Too many incorrect attempts. Try again in ${secondsLeft} seconds.`,
      "error"
    );

    lockoutTimer = window.setInterval(() => {
      secondsLeft--;

      if (secondsLeft <= 0) {
        window.clearInterval(lockoutTimer);
        lockoutTimer = null;
        isLockedOut = false;
        failedAttempts = 0;
        showStatus("You can try again now.", "info");
      } else {
        showStatus(
          `Too many incorrect attempts. Try again in ${secondsLeft} seconds.`,
          "error"
        );
      }
    }, 1000);
  }

  // Save notes automatically.
  function saveNotes() {
    if (!notesArea || vaultScreen?.hidden) return;

    localStorage.setItem(STORAGE.notes, notesArea.value);

    if (saveStatus) {
      saveStatus.textContent = "All changes saved";
      saveStatus.dataset.type = "success";
    }
  }

  if (notesArea) {
    notesArea.addEventListener("input", () => {
      if (saveStatus) {
        saveStatus.textContent = "Saving...";
        saveStatus.dataset.type = "info";
      }

      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(saveNotes, 400);
    });
  }

  // Lock the vault manually.
  if (lockButton) {
    lockButton.addEventListener("click", () => {
      window.clearTimeout(saveTimer);
      saveNotes();
      showScreen(lockScreen);
      showStatus("Vault locked.", "success");
      accessCode?.focus();
    });
  }

  // Show or hide access-code fields.
  toggleCodeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetSelector = button.dataset.toggleCode;
      const field = targetSelector
        ? document.querySelector(targetSelector)
        : button.parentElement?.querySelector("input");

      if (!field) return;

      const reveal = field.type === "password";
      field.type = reveal ? "text" : "password";
      button.setAttribute("aria-pressed", String(reveal));
      button.setAttribute(
        "aria-label",
        reveal ? "Hide access code" : "Show access code"
      );
    });
  });

  // Keyboard shortcut: Ctrl + Shift + K focuses the access-code field.
  document.addEventListener("keydown", (event) => {
    if (
      event.ctrlKey &&
      event.shiftKey &&
      event.key.toLowerCase() === "k"
    ) {
      event.preventDefault();

      if (!vaultScreen?.hidden) {
        lockButton?.click();
      } else if (!setupScreen?.hidden) {
        setupCode?.focus();
      } else {
        accessCode?.focus();
      }
    }

    // Escape locks the open vault.
    if (event.key === "Escape" && vaultScreen && !vaultScreen.hidden) {
      lockButton?.click();
    }
  });

  // Warn before leaving if notes are still being saved.
  window.addEventListener("pagehide", () => {
    window.clearTimeout(saveTimer);

    if (notesArea && vaultScreen && !vaultScreen.hidden) {
      localStorage.setItem(STORAGE.notes, notesArea.value);
    }
  });

  initializeVault();
});
