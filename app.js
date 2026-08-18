const STORAGE_KEY = "tomomi-shopping-basket-v1";

const state = loadState();
let editingId = null;

const el = {
  budget: document.querySelector("#budgetInput"),
  discountInput: document.querySelector("#discountInput"),
  form: document.querySelector("#itemForm"),
  name: document.querySelector("#itemName"),
  price: document.querySelector("#itemPrice"),
  list: document.querySelector("#itemList"),
  empty: document.querySelector("#emptyMessage"),
  count: document.querySelector("#itemCount"),
  subtotal: document.querySelector("#subtotalAmount"),
  discount: document.querySelector("#discountAmount"),
  payment: document.querySelector("#paymentAmount"),
  remaining: document.querySelector("#remainingAmount"),
  remainingLabel: document.querySelector("#remainingLabel"),
  remainingBlock: document.querySelector("#remainingBlock"),
  reset: document.querySelector("#resetButton"),
  dialog: document.querySelector("#editDialog"),
  editForm: document.querySelector("#editForm"),
  editName: document.querySelector("#editName"),
  editPrice: document.querySelector("#editPrice"),
  saveEdit: document.querySelector("#saveEditButton")
};

el.budget.value = state.budget;
el.discountInput.value = state.discount;

el.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = el.name.value.trim();
  const price = toMoney(el.price.value);
  if (!name) {
    el.name.focus();
    return;
  }
  if (price === null) {
    el.price.focus();
    return;
  }
  state.items.push({ id: makeId(), name, price });
  el.name.value = "";
  el.price.value = "";
  saveAndRender();
  el.name.focus();
});

el.budget.addEventListener("input", () => {
  const budget = toMoney(el.budget.value);
  state.budget = budget ?? 0;
  saveAndRender();
});

el.discountInput.addEventListener("input", () => {
  state.discount = toMoney(el.discountInput.value) ?? 0;
  saveAndRender();
});

el.list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  const id = button.dataset.id;
  if (button.classList.contains("delete-button")) {
    state.items = state.items.filter((item) => item.id !== id);
    saveAndRender();
    return;
  }
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;
  editingId = id;
  el.editName.value = item.name;
  el.editPrice.value = item.price;
  el.dialog.showModal();
});

el.editForm.addEventListener("submit", (event) => {
  if (event.submitter !== el.saveEdit) return;
  event.preventDefault();
  const name = el.editName.value.trim();
  const price = toMoney(el.editPrice.value);
  if (!name || price === null) return;
  const item = state.items.find((entry) => entry.id === editingId);
  if (item) {
    item.name = name;
    item.price = price;
  }
  editingId = null;
  el.dialog.close();
  saveAndRender();
});

el.reset.addEventListener("click", () => {
  if (!state.items.length) return;
  if (!confirm("今日の買い物を全部消す？")) return;
  state.items = [];
  state.discount = 0;
  el.discountInput.value = 0;
  saveAndRender();
});

function loadState() {
  const fallback = { budget: 2667, discount: 0, items: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.items)) return fallback;
    return {
      budget: Number.isFinite(saved.budget) ? saved.budget : fallback.budget,
      discount: Number.isFinite(saved.discount) ? Math.max(0, saved.discount) : (saved.coupon ? 500 : 0),
      items: saved.items.filter((item) => typeof item.name === "string" && Number.isFinite(item.price))
    };
  } catch {
    return fallback;
  }
}

function toMoney(value) {
  const digits = String(value).replace(/[^0-9]/g, "");
  if (!digits) return null;
  return Math.max(0, Number(digits));
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function yen(value) {
  return Math.round(value).toLocaleString("ja-JP");
}

function saveAndRender(shouldSave = true) {
  if (shouldSave) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function render() {
  const subtotal = state.items.reduce((sum, item) => sum + item.price, 0);
  const discount = Math.min(state.discount, subtotal);
  const payment = Math.max(0, subtotal - discount);
  const remaining = state.budget - payment;

  el.subtotal.textContent = yen(subtotal);
  el.discount.textContent = yen(discount);
  el.payment.textContent = yen(payment);
  el.remaining.textContent = yen(Math.abs(remaining));
  el.remainingLabel.textContent = remaining >= 0 ? "あと使える" : "予算を超えた分";
  el.remainingBlock.classList.toggle("over", remaining < 0);
  el.count.textContent = `${state.items.length}点`;
  el.empty.hidden = state.items.length > 0;

  el.list.replaceChildren(...state.items.map((item) => {
    const row = document.createElement("li");
    row.className = "item-row";
    const info = document.createElement("div");
    info.className = "item-info";
    const name = document.createElement("span");
    name.className = "item-name";
    name.textContent = item.name;
    const price = document.createElement("span");
    price.className = "item-price";
    price.textContent = `${yen(item.price)}円`;
    info.append(name, price);

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "edit-button";
    edit.dataset.id = item.id;
    edit.textContent = "直す";
    edit.setAttribute("aria-label", `${item.name}を直す`);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.dataset.id = item.id;
    remove.textContent = "×";
    remove.setAttribute("aria-label", `${item.name}を消す`);
    row.append(info, edit, remove);
    return row;
  }));
}

render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
}
