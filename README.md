# VAULT — Private Space Demo

A privacy-themed web app with a code-gated area for personal notes.

## Files
- `index.html` — interface
- `style.css` — styling
- `script.js` — access-code UI, local notes and locking behavior

## Run
Open `index.html` in a modern browser.

## Demo behavior
- First visit: create a code (at least 6 characters).
- Enter the code to reveal the private notes area.
- Notes are stored in this browser's localStorage.
- Lock the vault to hide the notes area again.
- Shortcut: `Ctrl + Shift + K` focuses access or opens setup.

## Security limitation — read before using
This is a front-end demonstration, **not a secure vault**. The access code and notes are stored in browser `localStorage` without encryption. Anyone with access to browser developer tools or the same user profile may inspect them, and the page itself is not hidden from browser history or the filesystem. Do not store sensitive passwords, private photos, identity documents, or financial information here.

For real privacy, build a backend or desktop app with authenticated access and encryption at rest; derive encryption keys from a password using a vetted Web Crypto flow and avoid storing the raw password.
