const statusEl = document.getElementById("status");
const itemsEl = document.getElementById("items");

fetch("/api/status")
  .then((r) => r.json())
  .then((data) => {statusEl.textContent = data.status;})
  .catch(() => {statusEl.textContent = "ERROR";});

fetch("/api/items")
  .then((r) => r.json())
  .then((items) => {
    itemsEl.innerHTML = "";
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.id} - ${item.name} (${item.description || ""})`;
      itemsEl.appendChild(li);
    });
  })
  .catch(() => {
    itemsEl.innerHTML = "<li>Erreur de chargement</li>";
  });
