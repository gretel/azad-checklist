let data = [];
let state = {};
let collapsedState = {};
let lang = localStorage.getItem("az104-lang") || "en";

try { const raw = localStorage.getItem("az104-checklist"); if (raw) state = JSON.parse(raw); } catch {}
try { const raw = localStorage.getItem("az104-collapsed"); if (raw) collapsedState = JSON.parse(raw); } catch {}

function k(di, ii) { return "d" + di + "-i" + ii; }
function render() {
  if (!data.length) return;
  document.documentElement.setAttribute("data-lang", lang);
  setActiveLangBtn();
  var root = document.getElementById("checklistRoot");
  root.innerHTML = "";
  var total = 0, checked = 0;

  for (var di = 0; di < data.length; di++) {
    try {
      var domain = data[di];
      var itemsHtml = "";
      for (var ii = 0; ii < domain.items.length; ii++) {
        try {
          var item = domain.items[ii];
          var key = k(di, ii);
          var c = state[key] || false;
          if (c) checked++;
          total++;
          var title = pickLang(item, "title");
          var bullets = pickLang(item, "bullets");
          if (!bullets) bullets = [];
          var docsBullet = item.docs ? '<li><a href="' + item.docs + '" target="_blank" class="doc-link">\u00b6 Docs</a></li>' : "";
          var list = "";
          for (var bj = 0; bj < bullets.length; bj++) {
            list += "<li>" + bullets[bj] + "</li>";
          }
          list += docsBullet;
          itemsHtml += '<label class="check-item' + (c ? " checked" : "") + '" data-key="' + key + '">' +
            '<input type="checkbox"' + (c ? " checked" : "") + ' data-key="' + key + '">' +
            '<div class="item-body"><div class="item-title">' + title + '</div><ul>' + list + '</ul></div></label>';
        } catch(e) { console.error("Item", di, ii, e); }
      }

      var dc = 0;
      for (var ii = 0; ii < domain.items.length; ii++) {
        if (state[k(di, ii)]) dc++;
      }
      var dt = domain.items.length;
      var allCkd = dc === dt;
      var name = pickLang(domain, "name");

      var sec = document.createElement("div");
      sec.className = "domain";
      var isCollapsed = collapsedState[di] !== undefined ? collapsedState[di] : allCkd;
      sec.innerHTML =
        '<div class="domain-header' + (isCollapsed ? " collapsed" : "") + '" data-di="' + di + '">' +
        '<span class="arrow">&#9660;</span>' +
        "<h2>" + name + "</h2>" +
        '<span class="weight">' + domain.weight + "</span>" +
        '<span class="domain-progress">' + dc + "/" + dt + "</span></div>" +
        '<div class="domain-items">' + itemsHtml + "</div>";
      root.appendChild(sec);
    } catch(e) { console.error("Domain", di, e); }
  }

  updProgress(total, checked);
  bindEvts();
  validateDocs();
}

function pickLang(obj, prefix) {
  return obj[prefix];
}

function updProgress(t, c) {
  var p = t > 0 ? Math.round((c / t) * 100) : 0;
  document.getElementById("progressFill").style.width = p + "%";
  document.getElementById("progressText").textContent = c + " / " + t + " (" + p + "%)";
}

function bindEvts() {
  var cbs = document.querySelectorAll(".check-item input");
  for (var ci = 0; ci < cbs.length; ci++) {
    cbs[ci].addEventListener("change", function() {
      try {
        var key = this.getAttribute("data-key");
        state[key] = this.checked;
        localStorage.setItem("az104-checklist", JSON.stringify(state));
        var lbl = this.closest(".check-item");
        if (this.checked) { lbl.classList.add("checked"); } else { lbl.classList.remove("checked"); }
        var t = 0, c = 0;
        var allInputs = document.querySelectorAll(".check-item input");
        for (var xi = 0; xi < allInputs.length; xi++) { t++; if (allInputs[xi].checked) c++; }
        updProgress(t, c);
        var domains = document.querySelectorAll(".domain");
        for (var di = 0; di < domains.length; di++) {
          var d = domains[di];
          var ckd = d.querySelectorAll(".check-item input:checked").length;
          var all = d.querySelectorAll(".check-item").length;
          var dp = d.querySelector(".domain-progress");
          if (dp) dp.textContent = ckd + "/" + all;
        }
      } catch(e) { console.error("Checkbox", e); }
    });
  }

  var headers = document.querySelectorAll(".domain-header");
  for (var hi = 0; hi < headers.length; hi++) {
    headers[hi].addEventListener("click", function(e) {
      try {
        if (e.target.closest("input")) return;
        var di = this.getAttribute("data-di");
        if (di === null) return;
        this.classList.toggle("collapsed");
        collapsedState[di] = this.classList.contains("collapsed");
        localStorage.setItem("az104-collapsed", JSON.stringify(collapsedState));
      } catch(ex) { console.error("Collapse", ex); }
    });
  }
}

function setActiveLangBtn() {
  document.getElementById("btnLangEn").className = lang === "en" ? "active" : "";
  document.getElementById("btnLangDe").className = lang === "de" ? "active" : "";
  document.getElementById("btnLangAr").className = lang === "ar" ? "active" : "";
  document.getElementById("btnLangEs").className = lang === "es" ? "active" : "";
}

function setLang(l) {
  if (l === lang) return;
  lang = l;
  localStorage.setItem("az104-lang", l);
  // Force reload from server
  var file = 'checklist-data-' + lang + '.json?v=' + Date.now();
  fetch(file)
    .then(r => r.json())
    .then(d => { data = d; render(); })
    .catch(e => { console.error('Failed to load ' + file, e); });
}

function collapseAll() {
  var headers = document.querySelectorAll(".domain-header");
  for (var hi = 0; hi < headers.length; hi++) {
    headers[hi].classList.add("collapsed");
    var di = headers[hi].getAttribute("data-di");
    if (di !== null) collapsedState[di] = true;
  }
  localStorage.setItem("az104-collapsed", JSON.stringify(collapsedState));
}

function expandAll() {
  var headers = document.querySelectorAll(".domain-header");
  for (var hi = 0; hi < headers.length; hi++) {
    headers[hi].classList.remove("collapsed");
    var di = headers[hi].getAttribute("data-di");
    if (di !== null) collapsedState[di] = false;
  }
  localStorage.setItem("az104-collapsed", JSON.stringify(collapsedState));
}

function resetStorage() {
  if (confirm("Reset all saved data?")) {
    localStorage.removeItem("az104-checklist");
    localStorage.removeItem("az104-collapsed");
    localStorage.removeItem("az104-lang");
    localStorage.removeItem("az104-theme");
    location.reload();
  }
}

function validateDocs() {
  if (typeof validator === 'undefined') return;
  var links = document.querySelectorAll('.doc-link');
  for (var li = 0; li < links.length; li++) {
    var href = links[li].getAttribute('href');
    if (href && !validator.isURL(href, { require_valid_protocol: true })) {
      links[li].style.color = '#ef4444';
      links[li].title = 'Invalid URL: ' + href;
    }
  }
}

function toggleTheme() {
  var root = document.documentElement;
  var isLight = root.classList.toggle("light");
  localStorage.setItem("az104-theme", isLight ? "light" : "dark");
  document.getElementById("btnTheme").textContent = isLight ? "\u25d1" : "\u25d0";
}

if (localStorage.getItem("az104-theme") === "light") {
  document.documentElement.classList.add("light");
  document.getElementById("btnTheme").textContent = "\u25d1";
}

// Load data per language
function loadData() {
  var file = 'checklist-data-' + lang + '.json?v=' + Date.now();
  fetch(file)
    .then(r => r.json())
    .then(d => { data = d; render(); })
    .catch(e => { console.error('Failed to load ' + file, e); });
}
loadData();
