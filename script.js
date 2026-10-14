
/* =========================================
   NUMI Calculator — script.js
   Features:
   - Basic arithmetic calculations
   - Keyboard support
   - Percentage and +/- toggle
   - Backspace and clear
   - Calculation history (LocalStorage)
   - Dark/Light theme
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  const display = document.getElementById("display");
  const historyList = document.getElementById("historyList");
  const historyPanel = document.getElementById("historyPanel");
  const themeToggle = document.getElementById("themeToggle");

  let currentInput = "0";
  let previousInput = null;
  let operator = null;
  let shouldResetDisplay = false;
  let calculationHistory = JSON.parse(
    localStorage.getItem("numiHistory") || "[]"
  );

  // -----------------------------------------
  // Display
  // -----------------------------------------

  function updateDisplay() {
    if (display) {
      display.textContent = currentInput;
    }
  }

  function formatNumber(number) {
    if (!Number.isFinite(number)) return "Error";

    return Number(number.toPrecision(12)).toString();
  }

  function inputNumber(number) {
    if (currentInput === "Error" || shouldResetDisplay) {
      currentInput = number;
      shouldResetDisplay = false;
    } else {
      currentInput =
        currentInput === "0" ? number : currentInput + number;
    }

    updateDisplay();
  }

  function inputDecimal() {
    if (currentInput === "Error" || shouldResetDisplay) {
      currentInput = "0.";
      shouldResetDisplay = false;
    } else if (!currentInput.includes(".")) {
      currentInput += ".";
    }

    updateDisplay();
  }

  // -----------------------------------------
  // Calculations
  // -----------------------------------------

  function calculate(a, b, op) {
    switch (op) {
      case "+":
        return a + b;

      case "-":
        return a - b;

      case "*":
        return a * b;

      case "/":
        return b === 0 ? NaN : a / b;

      default:
        return b;
    }
  }

  function chooseOperator(nextOperator) {
    if (currentInput === "Error") return;

    const inputValue = Number(currentInput);

    if (operator && !shouldResetDisplay) {
      const result = calculate(
        previousInput,
        inputValue,
        operator
      );

      currentInput = formatNumber(result);
      updateDisplay();

      previousInput =
        currentInput === "Error" ? null : Number(currentInput);
    } else {
      previousInput = inputValue;
    }

    operator = nextOperator;
    shouldResetDisplay = true;
  }

  function performCalculation() {
    if (
      operator === null ||
      previousInput === null ||
      currentInput === "Error"
    ) {
      return;
    }

    const firstNumber = previousInput;
    const secondNumber = Number(currentInput);
    const activeOperator = operator;

    const result = calculate(
      firstNumber,
      secondNumber,
      activeOperator
    );

    const formattedResult = formatNumber(result);

    addToHistory(
      `${firstNumber} ${activeOperator} ${secondNumber}`,
      formattedResult
    );

    currentInput = formattedResult;
    previousInput = null;
    operator = null;
    shouldResetDisplay = true;

    updateDisplay();
  }

  // -----------------------------------------
  // Calculator Actions
  // -----------------------------------------

  function clearCalculator() {
    currentInput = "0";
    previousInput = null;
    operator = null;
    shouldResetDisplay = false;

    updateDisplay();
  }

  function deleteLast() {
    if (currentInput === "Error" || shouldResetDisplay) {
      currentInput = "0";
      shouldResetDisplay = false;
    } else if (currentInput.length > 1) {
      currentInput = currentInput.slice(0, -1);

      if (currentInput === "-") {
        currentInput = "0";
      }
    } else {
      currentInput = "0";
    }

    updateDisplay();
  }

  function toggleSign() {
    if (currentInput === "Error") return;

    if (currentInput !== "0") {
      currentInput = currentInput.startsWith("-")
        ? currentInput.slice(1)
        : "-" + currentInput;
    }

    updateDisplay();
  }

  function calculatePercentage() {
    if (currentInput === "Error") return;

    currentInput = formatNumber(Number(currentInput) / 100);
    updateDisplay();
  }

  // -----------------------------------------
  // History
  // -----------------------------------------

  function addToHistory(expression, result) {
    if (result === "Error") return;

    calculationHistory.unshift({
      expression,
      result,
      time: new Date().toLocaleString()
    });

    calculationHistory = calculationHistory.slice(0, 30);

    localStorage.setItem(
      "numiHistory",
      JSON.stringify(calculationHistory)
    );

    renderHistory();
  }

  function renderHistory() {
    if (!historyList) return;

    historyList.innerHTML = "";

    if (calculationHistory.length === 0) {
      historyList.innerHTML =
        '<p class="empty-history">No calculations yet</p>';
      return;
    }

    calculationHistory.forEach((item) => {
      const historyItem = document.createElement("button");
      historyItem.type = "button";
      historyItem.className = "history-item";

      const expression = document.createElement("span");
      expression.className = "history-expression";
      expression.textContent = item.expression;

      const result = document.createElement("strong");
      result.className = "history-result";
      result.textContent = `= ${item.result}`;

      historyItem.append(expression, result);

      historyItem.addEventListener("click", () => {
        currentInput = item.result;
        previousInput = null;
        operator = null;
        shouldResetDisplay = true;
        updateDisplay();
      });

      historyList.appendChild(historyItem);
    });
  }

  function clearHistory() {
    calculationHistory = [];
    localStorage.removeItem("numiHistory");
    renderHistory();
  }

  // -----------------------------------------
  // Theme Toggle
  // -----------------------------------------

  function applyTheme(theme) {
    document.body.classList.toggle("light-theme", theme === "light");

    if (themeToggle) {
      themeToggle.setAttribute(
        "aria-label",
        theme === "light" ? "Switch to dark theme" : "Switch to light theme"
      );

      themeToggle.textContent = theme === "light" ? "☾" : "☀";
    }

    localStorage.setItem("numiTheme", theme);
  }

  applyTheme(localStorage.getItem("numiTheme") || "dark");

  themeToggle?.addEventListener("click", () => {
    const isLight = document.body.classList.contains("light-theme");
    applyTheme(isLight ? "dark" : "light");
  });

  // -----------------------------------------
  // Button Clicks
  // Supports data-action and common class names
  // -----------------------------------------

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const action = button.dataset.action;
    const value = button.dataset.value;
    const text = button.textContent.trim();

    if (button === themeToggle) return;

    if (action === "number" || button.classList.contains("number")) {
      inputNumber(value ?? text);
      return;
    }

    if (action === "decimal" || text === ".") {
      inputDecimal();
      return;
    }

    if (action === "clear" || text === "AC" || text === "C") {
      clearCalculator();
      return;
    }

    if (action === "delete" || text === "DEL" || text === "⌫") {
      deleteLast();
      return;
    }

    if (action === "percent" || text === "%") {
      calculatePercentage();
      return;
    }

    if (action === "sign" || text === "+/-" || text === "±") {
      toggleSign();
      return;
    }

    if (
      action === "equals" ||
      text === "="
    ) {
      performCalculation();
      return;
    }

    const operatorValue = value ?? text;

    if (
      ["+", "-", "*", "/", "×", "÷"].includes(operatorValue) ||
      action === "operator"
    ) {
      const normalizedOperator = {
        "×": "*",
        "÷": "/"
      }[operatorValue] ?? operatorValue;

      if (["+", "-", "*", "/"].includes(normalizedOperator)) {
        chooseOperator(normalizedOperator);
      }

      return;
    }

    if (
      action === "history" &&
      historyPanel
    ) {
      historyPanel.classList.toggle("open");
    }

    if (action === "clear-history") {
      clearHistory();
    }
  });

  // -----------------------------------------
  // Keyboard Support
  // -----------------------------------------

  document.addEventListener("keydown", (event) => {
    const key = event.key;

    if (/^[0-9]$/.test(key)) {
      inputNumber(key);
      return;
    }

    if (key === ".") {
      inputDecimal();
      return;
    }

    if (["+", "-", "*", "/"].includes(key)) {
      chooseOperator(key);
      return;
    }

    if (key === "Enter" || key === "=") {
      event.preventDefault();
      performCalculation();
      return;
    }

    if (key === "Backspace") {
      deleteLast();
      return;
    }

    if (key === "Escape" || key === "Delete") {
      clearCalculator();
      return;
    }

    if (key === "%") {
      calculatePercentage();
    }
  });

  // -----------------------------------------
  // Initial Setup
  // -----------------------------------------

  updateDisplay();
  renderHistory();
});
