
// NUMI Scientific Calculator — script.js
// Scientific functions, history, keyboard, themes and DEG/RAD mode.
// Uses a safe parser instead of eval().

document.addEventListener("DOMContentLoaded", () => {
  const display = document.getElementById("display");
  const preview = document.getElementById("expressionPreview");
  const status = document.getElementById("displayStatus");
  const keypad = document.getElementById("keypad");
  const historyList = document.getElementById("historyList");
  const clearHistoryBtn = document.getElementById("clearHistory");
  const themeToggle = document.getElementById("themeToggle");
  const copyResultBtn = document.getElementById("copyResult");
  const toast = document.getElementById("toast");

  let expression = "";
  let angleMode = "DEG";
  let lastAnswer = 0;
  let history = JSON.parse(
    localStorage.getItem("numiScientificHistory") || "[]"
  );
  let toastTimer;

  // ---------- Notifications ----------

  function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 1800);
  }

  // ---------- Display ----------

  function pretty(value) {
    return String(value)
      .replace(/\*/g, "×")
      .replace(/\//g, "÷")
      .replace(/-/g, "−");
  }

  function updateDisplay() {
    display.textContent = expression ? pretty(expression) : "0";
    status.textContent = `${angleMode} · SCIENTIFIC`;
    preview.textContent = expression
      ? "Expression in progress"
      : "Ready for your next calculation";
  }

  function insert(value) {
    if (display.textContent === "Error") {
      expression = "";
    }

    const replacements = {
      "π": "pi",
      "×": "*",
      "÷": "/",
      "−": "-",
      "√(": "sqrt(",
      "mod": "%"
    };

    value = replacements[value] || value;

    if (value === "Ans") {
      value = String(lastAnswer);
    }

    // Prevent multiple decimal points in one number.
    if (value === ".") {
      const currentNumber = expression.split(/[+\-*/()%^]/).pop();

      if (currentNumber.includes(".")) return;
    }

    expression += value;
    updateDisplay();
  }

  function clearAll() {
    expression = "";
    updateDisplay();
  }

  function deleteLast() {
    if (!expression) return;

    const functions = [
      "sqrt(", "sin(", "cos(", "tan(",
      "abs(", "log(", "ln("
    ];

    const matched = functions.find(fn => expression.endsWith(fn));

    expression = matched
      ? expression.slice(0, -matched.length)
      : expression.slice(0, -1);

    updateDisplay();
  }

  function toggleSign() {
    if (!expression) {
      expression = "-";
    } else if (/^-?\d*\.?\d+$/.test(expression)) {
      expression = expression.startsWith("-")
        ? expression.slice(1)
        : "-" + expression;
    } else {
      expression = `-(${expression})`;
    }

    updateDisplay();
  }

  // ---------- Mathematical Functions ----------

  function factorial(number) {
    if (
      !Number.isInteger(number) ||
      number < 0 ||
      number > 170
    ) {
      throw new Error("Factorial needs an integer from 0 to 170");
    }

    let result = 1;

    for (let i = 2; i <= number; i++) {
      result *= i;
    }

    return result;
  }

  // Tokenize only supported math syntax.
  function tokenize(input) {
    const tokens = [];

    const pattern =
      /\s*(?:(\d+(?:\.\d*)?|\.\d+)((?:[eE][+-]?\d+)?)|([a-zA-Z]+)|([()+\-*/%^!,]))/y;

    let position = 0;

    while (position < input.length) {
      pattern.lastIndex = position;
      const match = pattern.exec(input);

      if (!match) {
        throw new Error("Invalid character or expression");
      }

      position = pattern.lastIndex;

      if (match[1] !== undefined) {
        tokens.push({
          type: "number",
          value: Number(match[1] + (match[2] || ""))
        });
      } else if (match[3] !== undefined) {
        const name = match[3].toLowerCase();

        if (name === "pi") {
          tokens.push({ type: "number", value: Math.PI });
        } else if (name === "e") {
          tokens.push({ type: "number", value: Math.E });
        } else if (name === "ans") {
          tokens.push({ type: "number", value: lastAnswer });
        } else if (
          ["sin", "cos", "tan", "sqrt", "ln", "log", "abs"].includes(name)
        ) {
          tokens.push({ type: "function", value: name });
        } else {
          throw new Error(`Unknown function: ${name}`);
        }
      } else {
        tokens.push({ type: "symbol", value: match[4] });
      }
    }

    return tokens;
  }

  // ---------- Safe Expression Parser ----------

  function evaluate(input) {
    const tokens = tokenize(input);
    let index = 0;

    const peek = () => tokens[index];
    const take = () => tokens[index++];

    function parsePrimary() {
      const token = take();

      if (!token) {
        throw new Error("Incomplete expression");
      }

      if (token.type === "number") {
        return token.value;
      }

      if (token.type === "symbol" && token.value === "(") {
        const result = parseExpression();

        if (!peek() || take().value !== ")") {
          throw new Error("Missing closing parenthesis");
        }

        return result;
      }

      if (
        token.type === "symbol" &&
        (token.value === "+" || token.value === "-")
      ) {
        const value = parsePrimary();
        return token.value === "-" ? -value : value;
      }

      if (token.type === "function") {
        let value;

        if (peek() && peek().value === "(") {
          take();
          value = parseExpression();

          if (!peek() || take().value !== ")") {
            throw new Error("Missing closing parenthesis");
          }
        } else {
          value = parsePrimary();
        }

        switch (token.value) {
          case "sqrt":
            if (value < 0) {
              throw new Error("Cannot square-root a negative number");
            }
            return Math.sqrt(value);

          case "abs":
            return Math.abs(value);

          case "ln":
            if (value <= 0) {
              throw new Error("ln input must be positive");
            }
            return Math.log(value);

          case "log":
            if (value <= 0) {
              throw new Error("log input must be positive");
            }
            return Math.log10(value);

          case "sin":
            return Math.sin(
              angleMode === "DEG" ? value * Math.PI / 180 : value
            );

          case "cos":
            return Math.cos(
              angleMode === "DEG" ? value * Math.PI / 180 : value
            );

          case "tan": {
            const radians =
              angleMode === "DEG" ? value * Math.PI / 180 : value;

            if (Math.abs(Math.cos(radians)) < 1e-12) {
              throw new Error("Tangent is undefined at this angle");
            }

            return Math.tan(radians);
          }
        }
      }

      throw new Error("Invalid expression");
    }

    function parsePostfix() {
      let value = parsePrimary();

      while (peek() && ["!", "%"].includes(peek().value)) {
        const operation = take().value;

        value = operation === "!"
          ? factorial(value)
          : value / 100;
      }

      return value;
    }

    function parsePower() {
      let value = parsePostfix();

      if (peek() && peek().value === "^") {
        take();
        value = Math.pow(value, parseUnary());
      }

      return value;
    }

    function parseUnary() {
      if (
        peek() &&
        (peek().value === "+" || peek().value === "-")
      ) {
        const operation = take().value;
        const value = parseUnary();

        return operation === "-" ? -value : value;
      }

      return parsePower();
    }

    function parseTerm() {
      let value = parseUnary();

      while (
        peek() &&
        ["*", "/", "%"].includes(peek().value)
      ) {
        const operation = take().value;
        const right = parseUnary();

        if (
          (operation === "/" || operation === "%") &&
          right === 0
        ) {
          throw new Error("Cannot divide by zero");
        }

        if (operation === "*") value *= right;
        if (operation === "/") value /= right;
        if (operation === "%") value %= right;
      }

      return value;
    }

    function parseExpression() {
      let value = parseTerm();

      while (
        peek() &&
        (peek().value === "+" || peek().value === "-")
      ) {
        const operation = take().value;
        const right = parseTerm();

        value = operation === "+"
          ? value + right
          : value - right;
      }

      return value;
    }

    if (!tokens.length) {
      throw new Error("Enter a calculation first");
    }

    const result = parseExpression();

    if (index < tokens.length) {
      throw new Error("Check your operators and parentheses");
    }

    if (!Number.isFinite(result)) {
      throw new Error("Result is not a finite number");
    }

    return result;
  }

  // ---------- Calculate & Save History ----------

  function formatResult(number) {
    if (Object.is(number, -0)) number = 0;
    return Number(number.toPrecision(12)).toString();
  }

  function calculate() {
    if (!expression.trim()) return;

    const original = expression;

    try {
      const result = evaluate(expression);
      const formatted = formatResult(result);

      lastAnswer = result;

      history.unshift({
        expression: pretty(original),
        result: formatted,
        time: new Date().toLocaleString()
      });

      history = history.slice(0, 40);

      localStorage.setItem(
        "numiScientificHistory",
        JSON.stringify(history)
      );

      expression = formatted;
      renderHistory();
      updateDisplay();

      preview.textContent = `${pretty(original)} =`;
    } catch (error) {
      display.textContent = "Error";
      preview.textContent = error.message || "Unable to calculate";
      showToast(error.message || "Check your expression");
    }
  }

  function renderHistory() {
    if (!historyList) return;

    historyList.innerHTML = "";

    if (history.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-history";
      empty.textContent = "Your calculations will appear here.";
      historyList.appendChild(empty);
      return;
    }

    history.slice(0, 15).forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "history-item";

      const exp = document.createElement("span");
      exp.className = "history-expression";
      exp.textContent = item.expression;

      const result = document.createElement("strong");
      result.className = "history-result";
      result.textContent = `= ${item.result}`;

      button.append(exp, result);

      button.addEventListener("click", () => {
        expression = item.result;
        lastAnswer = Number(item.result);
        updateDisplay();
      });

      historyList.appendChild(button);
    });
  }

  // ---------- DEG / RAD ----------

  function setAngle(mode) {
    angleMode = mode;

    document.querySelectorAll("[data-angle]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.angle === mode
      );
    });

    updateDisplay();
  }

  // ---------- Theme ----------

  function applyTheme(theme) {
    document.body.classList.toggle(
      "light-theme",
      theme === "light"
    );

    localStorage.setItem("numiScientificTheme", theme);

    themeToggle.textContent = theme === "light" ? "☾" : "☀";

    themeToggle.setAttribute(
      "aria-label",
      theme === "light"
        ? "Switch to dark theme"
        : "Switch to light theme"
    );
  }

  // ---------- Button Events ----------

  keypad.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;

    switch (button.dataset.action) {
      case "clear":
        clearAll();
        return;

      case "delete":
        deleteLast();
        return;

      case "equals":
        calculate();
        return;

      case "percent":
        insert("%");
        return;

      case "sign":
        toggleSign();
        return;
    }

    if (button.dataset.value !== undefined) {
      insert(button.dataset.value);
    }
  });

  document.querySelectorAll("[data-angle]").forEach(button => {
    button.addEventListener("click", () => {
      setAngle(button.dataset.angle);
    });
  });

  clearHistoryBtn.addEventListener("click", () => {
    history = [];
    localStorage.removeItem("numiScientificHistory");
    renderHistory();
    showToast("History cleared");
  });

  themeToggle.addEventListener("click", () => {
    const currentTheme = document.body.classList.contains("light-theme")
      ? "light"
      : "dark";

    applyTheme(currentTheme === "light" ? "dark" : "light");
  });

  copyResultBtn.addEventListener("click", async () => {
    const value = display.textContent.trim();

    try {
      await navigator.clipboard.writeText(value);
      showToast("Result copied");
    } catch {
      showToast("Clipboard unavailable in this browser");
    }
  });

  // ---------- Keyboard Controls ----------

  document.addEventListener("keydown", event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (/^[0-9.]$/.test(event.key)) {
      insert(event.key);
      return;
    }

    if (["+", "-", "*", "/", "^", "(", ")", "!"].includes(event.key)) {
      insert(event.key);
      return;
    }

    if (event.key === "Enter" || event.key === "=") {
      event.preventDefault();
      calculate();
      return;
    }

    if (event.key === "Backspace") {
      deleteLast();
      return;
    }

    if (event.key === "Escape" || event.key === "Delete") {
      clearAll();
    }
  });

  // ---------- Start ----------

  applyTheme(
    localStorage.getItem("numiScientificTheme") || "dark"
  );

  renderHistory();
  updateDisplay();
});
