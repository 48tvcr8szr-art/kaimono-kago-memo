const STORAGE_KEY = "tomomi-shopping-basket-v1";

const state = loadState();
let editingId = null;

const el = {
  budget: document.querySelector("#budgetInput"),
  discountInput: document.querySelector("#discountInput"),
  discountStoreLabel: document.querySelector("#discountStoreLabel"),
  entryStoreLabel: document.querySelector("#entryStoreLabel"),
  storeTabs: document.querySelector(".store-tabs"),
  drugstoreTab: document.querySelector("#drugstoreTab"),
  enableDrugstore: document.querySelector("#enableDrugstore"),
  storeHint: document.querySelector("#storeHint"),
  supermarketPayment: document.querySelector("#supermarketPayment"),
  drugstorePayment: document.querySelector("#drugstorePayment"),
  drugstoreBreakdown: document.querySelector("#drugstoreBreakdown"),
  mustBuyForm: document.querySelector("#mustBuyForm"),
  mustBuyInput: document.querySelector("#mustBuyInput"),
  mustBuyList: document.querySelector("#mustBuyList"),
  mustBuyCount: document.querySelector("#mustBuyCount"),
  mustBuyEmpty: document.querySelector("#mustBuyEmpty"),
  clearChecked: document.querySelector("#clearCheckedButton"),
  form: document.querySelector("#itemForm"),
  name: document.querySelector("#itemName"),
  price: document.querySelector("#itemPrice"),
  quantity: document.querySelector("#itemQuantity"),
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
  editQuantity: document.querySelector("#editQuantity"),
  editStore: document.querySelector("#editStore"),
  saveEdit: document.querySelector("#saveEditButton"),
  deleteEdit: document.querySelector("#deleteEditButton")
};

el.budget.value = state.budget;
el.discountInput.value = state.discounts[state.activeStore];

el.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = el.name.value.trim();
  const price = toMoney(el.price.value);
  const quantity = toQuantity(el.quantity.value);
  if (!name) {
    el.name.focus();
    return;
  }
  if (price === null || quantity === null) {
    el.price.focus();
    return;
  }
  state.items.push({ id: makeId(), name, price, quantity, store: state.activeStore });
  el.name.value = "";
  el.price.value = "";
  el.quantity.value = 1;
  saveAndRender();
  el.name.focus();
});

el.budget.addEventListener("input", () => {
  const budget = toMoney(el.budget.value);
  state.budget = budget ?? 0;
  saveAndRender();
});

el.discountInput.addEventListener("input", () => {
  state.discounts[state.activeStore] = toMoney(el.discountInput.value) ?? 0;
  saveAndRender();
});

el.storeTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-store]");
  if (!button) return;
  state.activeStore = button.dataset.store;
  el.discountInput.value = state.discounts[state.activeStore];
  saveAndRender();
});

el.enableDrugstore.addEventListener("click", () => {
  state.drugstoreEnabled = true;
  state.activeStore = "drugstore";
  el.discountInput.value = state.discounts.drugstore;
  saveAndRender();
});

el.mustBuyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = el.mustBuyInput.value.trim();
  if (!name) return el.mustBuyInput.focus();
  state.mustBuys.push({ id: makeId(), name, checked: false, store: state.activeStore });
  el.mustBuyInput.value = "";
  saveAndRender();
  el.mustBuyInput.focus();
});

el.mustBuyList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  const item = state.mustBuys.find((entry) => entry.id === button.dataset.id);
  if (!item) return;
  item.checked = !item.checked;
  saveAndRender();
});

el.clearChecked.addEventListener("click", () => {
  state.mustBuys = state.mustBuys.filter((item) => !item.checked);
  saveAndRender();
});

el.list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  const id = button.dataset.id;
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return;
  editingId = id;
  el.editName.value = item.name;
  el.editPrice.value = item.price;
  el.editQuantity.value = item.quantity;
  el.editStore.value = item.store;
  el.dialog.showModal();
});

el.editForm.addEventListener("submit", (event) => {
  if (event.submitter !== el.saveEdit) return;
  event.preventDefault();
  const name = el.editName.value.trim();
  const price = toMoney(el.editPrice.value);
  const quantity = toQuantity(el.editQuantity.value);
  if (!name || price === null || quantity === null) return;
  const item = state.items.find((entry) => entry.id === editingId);
  if (item) {
    item.name = name;
    item.price = price;
    item.quantity = quantity;
    item.store = el.editStore.value;
    if (item.store === "drugstore") state.drugstoreEnabled = true;
  }
  editingId = null;
  el.dialog.close();
  saveAndRender();
});

el.deleteEdit.addEventListener("click", () => {
  if (!editingId) return;
  state.items = state.items.filter((item) => item.id !== editingId);
  editingId = null;
  el.dialog.close();
  saveAndRender();
});

el.reset.addEventListener("click", () => {
  if (!state.items.length && !state.mustBuys.length) return;
  if (!confirm("今日の買い物を全部消す？")) return;
  state.items = [];
  state.mustBuys = [];
  state.discounts = { supermarket: 0, drugstore: 0 };
  state.activeStore = "supermarket";
  state.drugstoreEnabled = false;
  el.discountInput.value = 0;
  saveAndRender();
});

function loadState() {
  const fallback = { budget: 2667, discounts: { supermarket: 0, drugstore: 0 }, activeStore: "supermarket", drugstoreEnabled: false, items: [], mustBuys: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.items)) return fallback;
    const discounts = saved.discounts && typeof saved.discounts === "object"
      ? { supermarket: Number(saved.discounts.supermarket) || 0, drugstore: Number(saved.discounts.drugstore) || 0 }
      : { supermarket: Number.isFinite(saved.discount) ? Math.max(0, saved.discount) : (saved.coupon ? 500 : 0), drugstore: 0 };
    const items = saved.items
      .filter((item) => typeof item.name === "string" && Number.isFinite(item.price))
      .map((item) => ({ ...item, store: item.store === "drugstore" ? "drugstore" : "supermarket", quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? Math.floor(item.quantity) : 1 }));
    const mustBuys = Array.isArray(saved.mustBuys)
      ? saved.mustBuys.filter((item) => typeof item.name === "string").map((item) => ({ id: item.id || makeId(), name: item.name, checked: Boolean(item.checked), store: item.store === "drugstore" ? "drugstore" : "supermarket" }))
      : [];
    const needsDrugstore = Boolean(saved.drugstoreEnabled) || items.some((item) => item.store === "drugstore") || mustBuys.some((item) => item.store === "drugstore") || discounts.drugstore > 0;
    return {
      budget: Number.isFinite(saved.budget) ? saved.budget : fallback.budget,
      discounts,
      activeStore: saved.activeStore === "drugstore" && needsDrugstore ? "drugstore" : "supermarket",
      drugstoreEnabled: needsDrugstore,
      mustBuys,
      items
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

function toQuantity(value) {
  const quantity = toMoney(value);
  if (quantity === null || quantity < 1) return null;
  return Math.floor(quantity);
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
  const supermarketSubtotal = storeSubtotal("supermarket");
  const drugstoreSubtotal = storeSubtotal("drugstore");
  const supermarketDiscount = Math.min(state.discounts.supermarket, supermarketSubtotal);
  const drugstoreDiscount = Math.min(state.discounts.drugstore, drugstoreSubtotal);
  const supermarketPayment = supermarketSubtotal - supermarketDiscount;
  const drugstorePayment = drugstoreSubtotal - drugstoreDiscount;
  const subtotal = supermarketSubtotal + drugstoreSubtotal;
  const discount = supermarketDiscount + drugstoreDiscount;
  const payment = supermarketPayment + drugstorePayment;
  const remaining = state.budget - payment;

  el.subtotal.textContent = yen(subtotal);
  el.discount.textContent = yen(discount);
  el.payment.textContent = yen(payment);
  el.remaining.textContent = yen(Math.abs(remaining));
  el.remainingLabel.textContent = remaining >= 0 ? "あと使える" : "予算を超えた分";
  el.remainingBlock.classList.toggle("over", remaining < 0);
  el.count.textContent = `${state.items.length}点`;
  el.empty.hidden = state.items.length > 0;
  const storeName = state.activeStore === "drugstore" ? "ドラッグストア" : "スーパー";
  el.discountStoreLabel.textContent = storeName;
  el.entryStoreLabel.textContent = storeName;
  el.supermarketPayment.textContent = yen(supermarketPayment);
  el.drugstorePayment.textContent = yen(drugstorePayment);
  el.drugstoreTab.hidden = !state.drugstoreEnabled;
  el.enableDrugstore.hidden = state.drugstoreEnabled;
  el.drugstoreBreakdown.hidden = !state.drugstoreEnabled;
  el.storeHint.textContent = state.drugstoreEnabled ? "店を押してから商品を入れる" : "いつもはスーパーだけで大丈夫";
  el.storeTabs.querySelectorAll("button[data-store]").forEach((button) => button.classList.toggle("active", button.dataset.store === state.activeStore));

  const remainingMustBuys = state.mustBuys.filter((item) => !item.checked).length;
  el.mustBuyCount.textContent = `残り${remainingMustBuys}`;
  el.mustBuyEmpty.hidden = state.mustBuys.length > 0;
  el.clearChecked.hidden = !state.mustBuys.some((item) => item.checked);
  el.mustBuyList.replaceChildren(...state.mustBuys.map((item) => {
    const row = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.id = item.id;
    button.className = item.checked ? "checked" : "";
    button.setAttribute("aria-pressed", String(item.checked));
    const mark = document.createElement("span");
    mark.className = "check-mark";
    mark.textContent = item.checked ? "✓" : "";
    const name = document.createElement("span");
    name.textContent = item.name;
    const store = document.createElement("small");
    store.className = `store-badge ${item.store}`;
    store.textContent = item.store === "drugstore" ? "ドラッグ" : "スーパー";
    button.append(mark, name, store);
    row.append(button);
    return row;
  }));

  el.list.replaceChildren(...state.items.map((item) => {
    const row = document.createElement("li");
    row.className = "item-row";
    const info = document.createElement("div");
    info.className = "item-info";
    const name = document.createElement("span");
    name.className = "item-name";
    const store = document.createElement("small");
    store.className = `store-badge ${item.store}`;
    store.textContent = item.store === "drugstore" ? "ドラッグ" : "スーパー";
    name.append(item.name, store);
    const price = document.createElement("span");
    price.className = "item-price";
    const itemTotal = item.price * item.quantity;
    price.textContent = item.quantity > 1
      ? `${yen(item.price)}円 × ${item.quantity}個 ＝ ${yen(itemTotal)}円`
      : `${yen(item.price)}円`;
    info.append(name, price);

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "edit-button";
    edit.dataset.id = item.id;
    edit.textContent = "直す";
    edit.setAttribute("aria-label", `${item.name}を直す`);

    row.append(info, edit);
    return row;
  }));
}

function storeSubtotal(store) {
  return state.items.filter((item) => item.store === store).reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
}
