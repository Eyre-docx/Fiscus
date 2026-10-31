const STORAGE_KEY = "ledgerly-transactions-v1";
const CURRENCY_KEY = "ledgerly-currency-v1";
const LOCALE = "en-SG";
const TIME_ZONE = "Asia/Singapore";
const DEFAULT_CURRENCY = "SGD";
const categoryColors = ["#315d43", "#82a96b", "#d0b562", "#e8ab7f", "#9d829c", "#7396a0", "#b8c2a8", "#bd795b"];
const categoryIcons = {
  "Food & Dining": "⌂",
  Transport: "↗",
  Shopping: "◇",
  "Bills & Utilities": "▤",
  Entertainment: "♫",
  Health: "✚",
  Housing: "⌂",
  Salary: "↗",
  Freelance: "✳",
  Other: "·"
};
const expenseCategories = ["Food & Dining", "Transport", "Shopping", "Bills & Utilities", "Entertainment", "Health", "Housing", "Other"];
const incomeCategories = ["Salary", "Freelance", "Interest", "Gift", "Other"];
const pageCopy = {
  overview: {
    name: "Overview",
    title: 'Your finances, <span>at a glance.</span>',
    subtitle: "A little clarity goes a long way. Here's your money snapshot."
  },
  transactions: {
    name: "Transactions",
    title: 'Every move, <span>in one place.</span>',
    subtitle: "Search, review, and manage your income and expenses."
  },
  spending: {
    name: "Spending",
    title: 'Know where it <span>all goes.</span>',
    subtitle: "Explore this month's expenses and spot your biggest categories."
  }
};

let toastTimer;
let storageWarning = false;
const supportedCurrencies = ["SGD", "MYR", "USD", "EUR", "GBP", "CAD", "AUD", "JPY"];

function loadCurrency() {
  try {
    const saved = localStorage.getItem(CURRENCY_KEY);
    return supportedCurrencies.includes(saved) ? saved : DEFAULT_CURRENCY;
  } catch (error) {
    console.error("Could not read the saved currency.", error);
    storageWarning = true;
    return DEFAULT_CURRENCY;
  }
}

const state = {
  transactions: loadTransactions(),
  currency: loadCurrency(),
  filter: "all",
  search: ""
};
const $ = (selector) => document.querySelector(selector);
const dialog = $("#transaction-dialog");
const form = $("#transaction-form");
const currencySelect = $("#currency");

if (storageWarning) showToast("Saved data could not be loaded.");

function loadTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new Error("Saved transactions are not a list.");
    return parsed.filter((item) =>
      item && typeof item.id === "string" &&
      typeof item.name === "string" &&
      typeof item.amount === "number" && Number.isFinite(item.amount) && item.amount > 0 &&
      (item.type === "income" || item.type === "expense") &&
      typeof item.category === "string" &&
      typeof item.date === "string" && !Number.isNaN(Date.parse(item.date))
    );
  } catch (error) {
    console.error("Could not read saved transactions.", error);
    storageWarning = true;
    return [];
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
  } catch (error) {
    console.error("Could not save transactions.", error);
    showToast("Could not save changes in this browser.");
  }
}

function money(amount, options = {}) {
  const locale = state.currency === "MYR" ? "en-MY" : LOCALE;
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: state.currency,
    maximumFractionDigits: 2,
    ...options
  }).formatToParts(amount);
  return parts.map((part) => part.type === "currency" && state.currency === "SGD" ? "S$" : part.value).join("");
}

function currencySymbol() {
  if (state.currency === "SGD") return "S$";
  const locale = state.currency === "MYR" ? "en-MY" : LOCALE;
  return new Intl.NumberFormat(locale, { style: "currency", currency: state.currency })
    .formatToParts(0)
    .find((part) => part.type === "currency").value;
}

function singaporeDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map(({ type, value }) => [type, value]));
}

function transactionYearMonth(dateString) {
  return dateString.slice(0, 7);
}

function isThisMonth(dateString) {
  const { year, month } = singaporeDateParts();
  return transactionYearMonth(dateString) === `${year}-${month}`;
}

function singaporeDateInputValue(date = new Date()) {
  const { year, month, day } = singaporeDateParts(date);
  return `${year}-${month}-${day}`;
}

function formatTransactionDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function render() {
  renderSummary();
  renderTransactions();
  renderSpending();
  renderCashflow();
}

function currentPage() {
  const route = window.location.hash.slice(1);
  return Object.hasOwn(pageCopy, route) ? route : "overview";
}

function renderPage() {
  const page = currentPage();
  const copy = pageCopy[page];
  document.querySelectorAll("[data-page]").forEach((section) => {
    section.hidden = section.dataset.page !== page;
  });
  document.querySelectorAll("[data-route]").forEach((link) => {
    const active = link.dataset.route === page;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  $("#current-page").textContent = copy.name;
  $("#page-title").innerHTML = copy.title;
  $("#page-subtitle").textContent = copy.subtitle;
  $("#today-label").hidden = page !== "overview";
  if (page === "spending") requestAnimationFrame(renderCashflow);
}

function renderSummary() {
  const monthTransactions = state.transactions.filter((item) => isThisMonth(item.date));
  const income = monthTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = monthTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const totalIncome = state.transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = state.transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  $("#balance-value").textContent = money(totalIncome - totalExpenses);
  $("#income-value").textContent = money(income);
  $("#expense-value").textContent = money(expenses);
  $("#savings-value").textContent = income ? `${Math.round(((income - expenses) / income) * 100)}%` : "—";
}

function renderTransactions() {
  const list = $("#transaction-list");
  const filtered = state.transactions
    .filter((item) => (state.filter === "all" || item.type === state.filter))
    .filter((item) => `${item.name} ${item.category} ${item.type} ${item.date}`.toLowerCase().includes(state.search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  list.replaceChildren();
  $("#empty-state").classList.toggle("visible", filtered.length === 0);
  $("#empty-title").textContent = state.transactions.length === 0 ? "No transactions yet" : "No matching transactions";
  $("#empty-description").textContent = state.transactions.length === 0
    ? "Add your first income or expense to see your finances take shape."
    : "Try another search or filter, or add a new transaction.";
  $("#transaction-count").textContent = `${filtered.length} ${filtered.length === 1 ? "transaction" : "transactions"}`;

  filtered.forEach((item) => list.append(createTransactionRow(item)));
  const recent = [...state.transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, 5);
  const recentList = $("#recent-transaction-list");
  recentList.replaceChildren();
  recent.forEach((item) => recentList.append(createTransactionRow(item)));
  $("#recent-empty-state").classList.toggle("visible", recent.length === 0);
}

function createTransactionRow(item) {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    const nameWrap = document.createElement("span");
    nameWrap.className = "transaction-name";
    const icon = document.createElement("span");
    icon.className = `transaction-icon${item.type === "income" ? " income" : ""}`;
    icon.textContent = categoryIcons[item.category] || "·";
    const name = document.createElement("span");
    name.textContent = item.name;
    nameWrap.append(icon, name);
    nameCell.append(nameWrap);

    const categoryCell = document.createElement("td");
    categoryCell.textContent = item.category;
    const dateCell = document.createElement("td");
    dateCell.textContent = formatTransactionDate(item.date);
    const amountCell = document.createElement("td");
    amountCell.className = `amount${item.type === "income" ? " income" : ""}`;
    amountCell.textContent = `${item.type === "income" ? "+" : "−"}${money(item.amount)}`;
    const actionCell = document.createElement("td");
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "delete-button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `Delete ${item.name}`);
    removeButton.addEventListener("click", () => {
      state.transactions = state.transactions.filter((transaction) => transaction.id !== item.id);
      saveTransactions();
      render();
      showToast("Transaction removed.");
    });
    actionCell.append(removeButton);
    row.append(nameCell, categoryCell, dateCell, amountCell, actionCell);
    return row;
}

function renderSpending() {
  const container = $("#spending-content");
  container.replaceChildren();
  const currentExpenses = state.transactions.filter((item) => item.type === "expense" && isThisMonth(item.date));
  const byCategory = new Map();
  currentExpenses.forEach((item) => byCategory.set(item.category, (byCategory.get(item.category) || 0) + item.amount));
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const total = categories.reduce((sum, [, amount]) => sum + amount, 0);
  if (!total) {
    const empty = document.createElement("div");
    empty.className = "spending-empty";
    empty.textContent = "No expenses this month yet. Add an expense to see your breakdown.";
    container.append(empty);
    $("#category-details").replaceChildren();
    return;
  }
  const segments = categories.map(([, amount], index) => {
    const start = categories.slice(0, index).reduce((sum, [, prior]) => sum + (prior / total) * 100, 0);
    return `${categoryColors[index % categoryColors.length]} ${start}% ${start + (amount / total) * 100}%`;
  });
  const donut = document.createElement("div");
  donut.className = "donut";
  donut.style.background = `conic-gradient(${segments.join(", ")})`;
  donut.setAttribute("role", "img");
  donut.setAttribute("aria-label", `Expenses total ${money(total)} this month`);
  const center = document.createElement("div");
  center.className = "donut-center";
  const totalLabel = document.createElement("strong");
  totalLabel.textContent = money(total, { notation: total > 99999 ? "compact" : "standard" });
  const monthLabel = document.createElement("small");
  monthLabel.textContent = "THIS MONTH";
  center.append(totalLabel, monthLabel);
  donut.append(center);

  const legend = document.createElement("div");
  legend.className = "category-legend";
  categories.slice(0, 5).forEach(([category, amount], index) => {
    const row = document.createElement("div");
    row.className = "category-row";
    const dot = document.createElement("span");
    dot.className = "category-dot";
    dot.style.backgroundColor = categoryColors[index % categoryColors.length];
    const label = document.createElement("span");
    label.className = "category-name";
    label.textContent = category;
    const value = document.createElement("span");
    value.className = "category-amount";
    value.textContent = `${Math.round((amount / total) * 100)}%`;
    row.append(dot, label, value);
    legend.append(row);
  });
  container.append(donut, legend);
  const details = $("#category-details");
  details.replaceChildren();
  categories.forEach(([category, amount], index) => {
    const button = document.createElement("button");
    button.className = "category-detail";
    button.type = "button";
    button.setAttribute("aria-label", `View ${category} transactions`);
    const marker = document.createElement("span");
    marker.className = "category-dot";
    marker.style.backgroundColor = categoryColors[index % categoryColors.length];
    const name = document.createElement("span");
    name.className = "category-detail-name";
    name.textContent = category;
    const share = document.createElement("span");
    share.className = "category-detail-share";
    share.textContent = `${Math.round((amount / total) * 100)}%`;
    const value = document.createElement("strong");
    value.textContent = money(amount);
    button.append(marker, name, share, value);
    button.addEventListener("click", () => {
      state.filter = "expense";
      state.search = category;
      $("#transaction-filter").value = "expense";
      $("#transaction-search").value = category;
      window.location.hash = "transactions";
    });
    details.append(button);
  });
}

function renderCashflow() {
  const chart = $("#cashflow-chart");
  chart.replaceChildren();
  const { year, month } = singaporeDateParts();
  const currentMonth = Number(month) - 1;
  const months = Array.from({ length: 6 }, (_, index) => new Date(Date.UTC(Number(year), currentMonth - 5 + index, 1)));
  const values = months.map((month) => {
    const monthKey = `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}`;
    const monthItems = state.transactions.filter((item) => transactionYearMonth(item.date) === monthKey);
    return {
      income: monthItems.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0),
      expense: monthItems.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0),
      label: new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", month: "short" }).format(month)
    };
  });
  const max = Math.max(1, ...values.flatMap((item) => [item.income, item.expense]));
  const width = Math.max(420, chart.clientWidth || 600);
  const height = 190;
  const left = 34;
  const right = 12;
  const top = 10;
  const bottom = 25;
  const plotHeight = height - top - bottom;
  const plotWidth = width - left - right;
  const x = (index) => left + (plotWidth * index) / (values.length - 1);
  const y = (value) => top + plotHeight - (value / max) * plotHeight;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "none");

  for (let tick = 0; tick <= 3; tick += 1) {
    const tickY = top + (plotHeight * tick) / 3;
    const line = document.createElementNS(svg.namespaceURI, "line");
    line.setAttribute("x1", String(left));
    line.setAttribute("x2", String(width - right));
    line.setAttribute("y1", String(tickY));
    line.setAttribute("y2", String(tickY));
    line.setAttribute("class", "chart-grid");
    svg.append(line);
    const label = document.createElementNS(svg.namespaceURI, "text");
    label.setAttribute("x", "0");
    label.setAttribute("y", String(tickY + 3));
    label.setAttribute("class", "chart-label");
    label.textContent = money(max * (1 - tick / 3), { notation: "compact", maximumFractionDigits: 0 });
    svg.append(label);
  }

  for (const [key, lineClass, dotClass] of [["income", "chart-income", "chart-dot-income"], ["expense", "chart-expense", "chart-dot-expense"]]) {
    const path = document.createElementNS(svg.namespaceURI, "path");
    path.setAttribute("class", lineClass);
    path.setAttribute("d", values.map((value, index) => `${index ? "L" : "M"} ${x(index)} ${y(value[key])}`).join(" "));
    svg.append(path);
    values.forEach((value, index) => {
      const point = document.createElementNS(svg.namespaceURI, "circle");
      point.setAttribute("cx", String(x(index)));
      point.setAttribute("cy", String(y(value[key])));
      point.setAttribute("r", "4");
      point.setAttribute("class", dotClass);
      svg.append(point);
    });
  }

  values.forEach((value, index) => {
    const label = document.createElementNS(svg.namespaceURI, "text");
    label.setAttribute("x", String(x(index)));
    label.setAttribute("y", String(height - 5));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("class", "chart-label");
    label.textContent = value.label;
    svg.append(label);
  });
  chart.append(svg);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

function renderCategoryOptions(type, selectedCategory) {
  const select = $("#transaction-category");
  const categories = type === "income" ? incomeCategories : expenseCategories;
  select.replaceChildren();
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    option.selected = category === selectedCategory;
    select.append(option);
  });
}

function openDialog() {
  form.reset();
  renderCategoryOptions("expense");
  $("#transaction-date").value = singaporeDateInputValue();
  $("#currency-symbol").textContent = currencySymbol();
  dialog.showModal();
  $("#transaction-name").focus();
}

function exportCsv() {
  const rows = [["Description", "Type", "Category", "Date", "Amount"]];
  [...state.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((item) => rows.push([item.name, item.type, item.category, item.date, item.amount.toFixed(2)]));
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = `fiscus-transactions-${singaporeDateInputValue()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

$("#today-label").textContent = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  weekday: "long",
  month: "long",
  day: "numeric"
}).format(new Date()).toUpperCase();
currencySelect.value = state.currency;
currencySelect.addEventListener("change", () => {
  state.currency = currencySelect.value;
  try {
    localStorage.setItem(CURRENCY_KEY, state.currency);
  } catch (error) {
    console.error("Could not save the selected currency.", error);
    showToast("Could not save your currency preference.");
  }
  render();
  $("#currency-symbol").textContent = currencySymbol();
});
$("#transaction-filter").addEventListener("change", (event) => {
  state.filter = event.target.value;
  renderTransactions();
});
$("#transaction-search").addEventListener("input", (event) => {
  state.search = event.target.value.trim();
  renderTransactions();
});
$("#add-transaction").addEventListener("click", openDialog);
$("#empty-add").addEventListener("click", openDialog);
$("#transactions-empty-add").addEventListener("click", openDialog);
$("#close-dialog").addEventListener("click", () => dialog.close());
$("#export-csv").addEventListener("click", exportCsv);
form.querySelectorAll('input[name="type"]').forEach((input) => {
  input.addEventListener("change", (event) => renderCategoryOptions(event.target.value));
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const amount = Number(data.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    $("#transaction-amount").setCustomValidity("Enter an amount greater than zero.");
    $("#transaction-amount").reportValidity();
    return;
  }
  if (!String(data.get("name")).trim()) {
    $("#transaction-name").setCustomValidity("Enter a description.");
    $("#transaction-name").reportValidity();
    return;
  }
  $("#transaction-name").setCustomValidity("");
  $("#transaction-amount").setCustomValidity("");
  state.transactions.push({
    id: crypto.randomUUID(),
    name: String(data.get("name")).trim(),
    type: String(data.get("type")),
    amount,
    date: String(data.get("date")),
    category: String(data.get("category"))
  });
  saveTransactions();
  render();
  dialog.close();
  showToast("Transaction added.");
});
$("#transaction-amount").addEventListener("input", (event) => event.target.setCustomValidity(""));
window.addEventListener("hashchange", () => {
  renderPage();
  renderTransactions();
});
window.addEventListener("resize", renderCashflow);

if (!window.location.hash) window.history.replaceState(null, "", "#overview");
renderPage();
render();
