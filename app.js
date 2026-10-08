// ============================================================
// KONFIGURACIJA — JSONBin.io (cloud backup)
// ============================================================
const JSONBIN_MASTER_KEY = "$2a$10$/ud4vWXIrbZzrKaI4X29de7RuInU4xl48U0.O1TtjquKsscfMg9kC"; // <-- NALEPI SVOJ KLJUČ

// ============================================================
// KONFIGURACIJA — Telegram dnevni backup
// ============================================================
const TELEGRAM_BOT_TOKEN = "8857447486:AAF7RMw0WeAXx_6eXOKlbPm4xgQXt3g0Rk8"; // <-- NALEPI SVOJ TOKEN
const TELEGRAM_CHAT_ID = "1740770878";
const TELEGRAM_LAST_KEY = "nokti_telegram_last_backup";

// ============================================================
// STORAGE
// ============================================================
const STORAGE_KEY = "nokti_state_v1";
const INITIALIZED_KEY = "nokti_initialized";
const BIN_ID_KEY = "nokti_bin_id";

if (navigator.storage?.persist) {
  navigator.storage.persist().then(granted => {
    console.log("[Nokti] Persistent storage:", granted ? "ODOBREN" : "odbijen");
  });
}

let state = null;
let backupTimer = null;
let lastBackupTime = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return reviveState(JSON.parse(raw));
  } catch (e) { console.warn(e); }
  return null;
}

function saveState() {
  if (!state) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    scheduleBackup();
  } catch (e) { console.warn(e); }
}

function reviveState(raw) {
  return {
    clients: raw.clients || [],
    services: raw.services || [],
    appointments: (raw.appointments || []).map(a => ({ ...a, date: new Date(a.date) })),
    settings: raw.settings || { workStart: 8, workEnd: 20, cloudBackupEnabled: true },
    selectedDate: new Date(),
    currentTab: "today",
    profileClientId: null
  };
}

function seedDemoState() {
  const today = (h, m=0) => { const d = new Date(); d.setHours(h, m, 0, 0); return d; };
  const daysAgo = (n, h, m=0) => { const d = new Date(); d.setDate(d.getDate()-n); d.setHours(h, m, 0, 0); return d; };
  const daysAhead = (n, h, m=0) => { const d = new Date(); d.setDate(d.getDate()+n); d.setHours(h, m, 0, 0); return d; };
  return {
    clients: [
      { id: "c1", firstName: "Ana", lastName: "Petrović", phone: "064 123 4567", note: "Voli kraće nokte.", isArchived: false },
      { id: "c2", firstName: "Marija", lastName: "Simić", phone: "063 555 111", note: "", isArchived: false },
      { id: "c3", firstName: "Kristina", lastName: "Jovanović", phone: "", note: "", isArchived: false },
      { id: "c4", firstName: "Jelena", lastName: "Marić", phone: "", note: "Drugarica od Ane.", isArchived: false }
    ],
    services: [
      { id: "s1", name: "Gel lak", price: 2500, sortOrder: 0, isArchived: false },
      { id: "s2", name: "Korekcija", price: 2000, sortOrder: 1, isArchived: false },
      { id: "s3", name: "Novi set", price: 3000, sortOrder: 2, isArchived: false },
      { id: "s4", name: "Manikir", price: 1500, sortOrder: 3, isArchived: false },
      { id: "s5", name: "Pedikir", price: 2000, sortOrder: 4, isArchived: false },
      { id: "s6", name: "French", price: 500, sortOrder: 5, isArchived: false }
    ],
    appointments: [
      { id:"a1", date:today(10).toISOString(), clientId:"c1", services:[{name:"Gel lak",price:2500},{name:"French",price:500}], status:"scheduled", paymentStatus:"unpaid" },
      { id:"a2", date:today(12).toISOString(), clientId:"c2", services:[{name:"Manikir",price:1500},{name:"Pedikir",price:2000}], status:"scheduled", paymentStatus:"unpaid" },
      { id:"a3", date:today(16).toISOString(), clientId:"c3", services:[{name:"Gel lak",price:2500}], status:"scheduled", paymentStatus:"unpaid" },
      { id:"a4", date:daysAhead(1,11).toISOString(), clientId:"c1", services:[{name:"Korekcija",price:2000}], status:"scheduled", paymentStatus:"unpaid" },
      { id:"a5", date:daysAhead(3,10).toISOString(), clientId:"c4", services:[{name:"Manikir",price:1500}], status:"scheduled", paymentStatus:"unpaid" },
      { id:"a7", date:daysAgo(1,14).toISOString(), clientId:"c2", services:[{name:"Gel lak",price:2500}], status:"completed", paymentStatus:"unpaid" },
      { id:"a8", date:daysAgo(2,10).toISOString(), clientId:"c1", services:[{name:"Gel lak",price:2500}], status:"completed", paymentStatus:"paid" },
      { id:"a9", date:daysAgo(5,11).toISOString(), clientId:"c1", services:[{name:"Gel lak",price:2500}], status:"completed", paymentStatus:"paid" },
      { id:"a10", date:daysAgo(12,10).toISOString(), clientId:"c1", services:[{name:"Korekcija",price:2000}], status:"completed", paymentStatus:"paid" },
      { id:"a11", date:daysAgo(3,13).toISOString(), clientId:"c3", services:[{name:"Manikir",price:1500}], status:"cancelled", paymentStatus:"unpaid" }
    ],
    settings: { workStart: 8, workEnd: 20, cloudBackupEnabled: true },
    selectedDate: new Date(),
    currentTab: "today",
    profileClientId: null
  };
}

function seedEmptyState() {
  return {
    clients: [],
    services: [
      { id: "s1", name: "Gel lak", price: 2500, sortOrder: 0, isArchived: false },
      { id: "s2", name: "Korekcija", price: 2000, sortOrder: 1, isArchived: false },
      { id: "s3", name: "Novi set", price: 3000, sortOrder: 2, isArchived: false },
      { id: "s4", name: "Manikir", price: 1500, sortOrder: 3, isArchived: false },
      { id: "s5", name: "Pedikir", price: 2000, sortOrder: 4, isArchived: false }
    ],
    appointments: [],
    settings: { workStart: 8, workEnd: 20, cloudBackupEnabled: true },
    selectedDate: new Date(),
    currentTab: "today",
    profileClientId: null
  };
}

// ============================================================
// CLOUD BACKUP (JSONBin)
// ============================================================
function scheduleBackup() {
  if (!JSONBIN_MASTER_KEY) return;
  if (!state.settings.cloudBackupEnabled) return;
  if (backupTimer) clearTimeout(backupTimer);
  backupTimer = setTimeout(() => backupToCloud(), 8000);
}

async function backupToCloud() {
  if (!JSONBIN_MASTER_KEY) return;
  if (!state.settings.cloudBackupEnabled) return;

  try {
    const binId = localStorage.getItem(BIN_ID_KEY);
    const payload = JSON.parse(JSON.stringify(state));
    const url = binId
      ? `https://api.jsonbin.io/v3/b/${binId}`
      : `https://api.jsonbin.io/v3/b`;
    const method = binId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type":"application/json", "X-Master-Key": JSONBIN_MASTER_KEY },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (!binId) localStorage.setItem(BIN_ID_KEY, data.metadata.id);

    lastBackupTime = new Date();
    updateBackupStatus();
  } catch (e) {
    console.warn("[Backup] fail:", e.message);
  }
}

async function restoreFromCloud() {
  if (!JSONBIN_MASTER_KEY) throw new Error("Backup nije postavljen");
  const binId = localStorage.getItem(BIN_ID_KEY);
  if (!binId) throw new Error("Nema cloud kopije");

  const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
    headers: { "X-Master-Key": JSONBIN_MASTER_KEY }
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  return reviveState(data.record);
}

// ============================================================
// TELEGRAM DNEVNI BACKUP
// ============================================================
async function sendTelegramBackup(force = false) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;
  if (!state) return false;

  if (!force) {
    const lastStr = localStorage.getItem(TELEGRAM_LAST_KEY);
    if (lastStr) {
      const last = new Date(lastStr);
      const hoursSince = (Date.now() - last.getTime()) / 3600000;
      if (hoursSince < 20) return false;
    }
  }

  try {
    const json = JSON.stringify(state, null, 2);
    const date = new Date();
    const dateStr = `${String(date.getDate()).padStart(2,"0")}.${String(date.getMonth()+1).padStart(2,"0")}.${date.getFullYear()}`;
    const timeStr = `${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
    const filename = `nokti-backup-${date.toISOString().slice(0,10)}.json`;

    const formData = new FormData();
    formData.append("chat_id", TELEGRAM_CHAT_ID);
    formData.append("document", new Blob([json], { type: "application/json" }), filename);
    formData.append("caption",
      `📦 Nokti dnevni backup\n` +
      `📅 ${dateStr} u ${timeStr}\n\n` +
      `👥 Klijentkinje: ${state.clients.length}\n` +
      `📆 Termini: ${state.appointments.length}\n` +
      `💰 Završeno: ${state.appointments.filter(a => a.status === "completed").length}`
    );

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error("HTTP " + res.status + ": " + errText);
    }

    localStorage.setItem(TELEGRAM_LAST_KEY, new Date().toISOString());
    console.log("[Telegram] Dnevni backup poslan");
    return true;
  } catch (e) {
    console.warn("[Telegram] Backup failed:", e.message);
    return false;
  }
}

setTimeout(() => sendTelegramBackup(), 5000);
setInterval(() => sendTelegramBackup(), 30 * 60 * 1000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    setTimeout(() => sendTelegramBackup(), 2000);
  }
});

// ============================================================
// HELPERS
// ============================================================
const DAYS_LONG = ["nedelja","ponedeljak","utorak","sreda","četvrtak","petak","subota"];
const DAYS_SHORT = ["NED","PON","UTO","SRE","ČET","PET","SUB"];
const MONTHS = ["januar","februar","mart","april","maj","jun","jul","avgust","septembar","oktobar","novembar","decembar"];
const MONTHS_SHORT = ["jan","feb","mar","apr","maj","jun","jul","avg","sep","okt","nov","dec"];

function startOfDay(d) { const x=new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d,n) { const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function sameDay(a,b) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function isToday(d) { return sameDay(d,new Date()); }
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function formatTime(d) { const x=d instanceof Date?d:new Date(d); return `${String(x.getHours()).padStart(2,"0")}:${String(x.getMinutes()).padStart(2,"0")}`; }
function formatMoney(n) { return Number(n).toLocaleString("sr-RS") + " RSD"; }
function formatMoneyShort(n) { return Number(n).toLocaleString("sr-RS"); }
function minutesFromDate(d) { return d.getHours()*60 + d.getMinutes(); }
function formatMinutes(m) { return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`; }

function dayTitle(d) {
  const diff = Math.round((startOfDay(d)-startOfDay(new Date()))/86400000);
  if (diff === 0) return "Danas";
  if (diff === 1) return "Sutra";
  if (diff === -1) return "Juče";
  return capitalize(DAYS_LONG[d.getDay()]);
}
function daySubtitle(d) { return `${capitalize(DAYS_LONG[d.getDay()])}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`; }
function weekFor(d) {
  const day=d.getDay(); const diff = day===0?-6:1-day;
  const mon = addDays(d, diff);
  return Array.from({length:7},(_,i)=>addDays(mon,i));
}
function clientById(id) { return state.clients.find(c=>c.id===id); }
function appointmentTotal(a) { return a.services.reduce((s,x)=>s+x.price,0); }
function appointmentsFor(d) { return state.appointments.filter(a=>sameDay(new Date(a.date),d)).sort((a,b)=>new Date(a.date)-new Date(b.date)); }
function dayHasAppointments(d) { return state.appointments.some(a=>sameDay(new Date(a.date),d)); }
function isPaidCompleted(a) { return a.status==="completed" && a.paymentStatus==="paid"; }
function isAwaitingPayment(a) { return a.status==="completed" && a.paymentStatus==="unpaid"; }

function paidRevenueInRange(start,end) {
  return state.appointments.filter(a=>isPaidCompleted(a) && new Date(a.date)>=start && new Date(a.date)<end).reduce((s,a)=>s+appointmentTotal(a),0);
}
function todayRevenue() { const s=startOfDay(new Date()); return paidRevenueInRange(s, addDays(s,1)); }
function weekRevenue() {
  const day=new Date().getDay(); const diff = day===0?-6:1-day;
  const mon = startOfDay(addDays(new Date(), diff));
  return paidRevenueInRange(mon, addDays(mon,7));
}
function monthRevenue() {
  const d=new Date(); const s=new Date(d.getFullYear(),d.getMonth(),1); const e=new Date(d.getFullYear(),d.getMonth()+1,1);
  return paidRevenueInRange(s,e);
}
function unpaidTotal() { return state.appointments.filter(isAwaitingPayment).reduce((s,a)=>s+appointmentTotal(a),0); }
function unpaidAppointments() { return state.appointments.filter(isAwaitingPayment).sort((a,b)=>new Date(a.date)-new Date(b.date)); }
function clientPaidRevenue(id) { return state.appointments.filter(a=>a.clientId===id && isPaidCompleted(a)).reduce((s,a)=>s+appointmentTotal(a),0); }
function clientUnpaidTotal(id) { return state.appointments.filter(a=>a.clientId===id && isAwaitingPayment(a)).reduce((s,a)=>s+appointmentTotal(a),0); }
function initials(c) { if(!c) return "—"; return (c.firstName[0]||"") + (c.lastName[0]||""); }

function nextAppointmentFor(clientId) {
  return state.appointments.filter(a=>a.clientId===clientId && a.status==="scheduled" && new Date(a.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date))[0];
}
function lastCompletedFor(clientId) {
  return state.appointments.filter(a=>a.clientId===clientId && a.status==="completed").sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
}

// Detektuje "Slobodan Termin" i slično
function isFakeAppointment(apt) {
  if (!apt) return false;
  const client = clientById(apt.clientId);
  if (!client) return false;
  const fullName = `${client.firstName} ${client.lastName}`.toLowerCase().trim();
  return fullName.includes("slobodan")
      || fullName.includes("slobodno")
      || fullName.includes("blokirano")
      || fullName.includes("zauzeto")
      || fullName.includes("blocked");
}

// ============================================================
// TOAST + UNDO
// ============================================================
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(()=>{ el.classList.add("fade-out"); setTimeout(()=>el.remove(),300); }, 2200);
}

function toastUndo(msg, undoFn) {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = "toast undo-toast";
  el.innerHTML = `<span>${msg}</span><button class="toast-undo-btn">Poništi</button>`;
  container.appendChild(el);
  let active = true;
  el.querySelector("button").onclick = () => {
    if (!active) return;
    active = false;
    undoFn();
    el.classList.add("fade-out");
    setTimeout(()=>el.remove(), 300);
  };
  setTimeout(()=>{
    if (!active) return;
    active = false;
    el.classList.add("fade-out");
    setTimeout(()=>el.remove(), 300);
  }, 5000);
}

// ============================================================
// SHEET SYSTEM
// ============================================================
let activeSheet = null;

function openSheet(html) {
  const container = document.getElementById("sheet-container");
  const overlay = document.getElementById("sheet-overlay");
  container.innerHTML = `<div class="sheet">${html}</div>`;
  requestAnimationFrame(()=>{ overlay.classList.add("visible"); container.classList.add("visible"); });
  overlay.onclick = () => closeSheet();
  activeSheet = true;
}
function closeSheet() {
  const container = document.getElementById("sheet-container");
  const overlay = document.getElementById("sheet-overlay");
  overlay.classList.remove("visible");
  container.classList.remove("visible");
  setTimeout(()=>{ container.innerHTML=""; activeSheet=null; }, 400);
}

// ============================================================
// WELCOME
// ============================================================
function showWelcomeIfNeeded() {
  if (localStorage.getItem(INITIALIZED_KEY)) return false;
  const overlay = document.getElementById("welcome-overlay");
  overlay.classList.remove("hidden");
  requestAnimationFrame(()=> overlay.classList.add("visible"));
  return true;
}
function startFresh() {
  state = seedEmptyState();
  localStorage.setItem(INITIALIZED_KEY, "1");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  hideWelcome();
}
function startWithDemo() {
  state = seedDemoState();
  localStorage.setItem(INITIALIZED_KEY, "1");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  hideWelcome();
}
function hideWelcome() {
  const overlay = document.getElementById("welcome-overlay");
  overlay.classList.remove("visible");
  setTimeout(()=> overlay.classList.add("hidden"), 400);
  renderToday();
  updateSettingsSub();
}

// ============================================================
// RENDER — DANAS
// ============================================================
function renderToday() {
  const title=document.getElementById("day-title");
  const sub=document.getElementById("day-subtitle");
  const strip=document.getElementById("week-strip");
  const summary=document.getElementById("day-summary");
  const list=document.getElementById("appointments-list");
  const backBtn=document.getElementById("btn-back-today");

  const d = state.selectedDate;
  title.textContent = dayTitle(d);
  sub.textContent = daySubtitle(d);

  strip.innerHTML = "";
  weekFor(d).forEach(day => {
    const btn = document.createElement("button");
    btn.className = "week-day";
    if (sameDay(day, d)) btn.classList.add("selected");
    if (isToday(day)) btn.classList.add("today");
    if (dayHasAppointments(day)) btn.classList.add("has-appointments");
    btn.innerHTML = `
      <span class="week-day-label">${DAYS_SHORT[day.getDay()]}</span>
      <span class="week-day-number">${day.getDate()}</span>
      <span class="week-day-dot"></span>`;
    btn.onclick = () => { state.selectedDate = startOfDay(day); saveState(); renderToday(); };
    strip.appendChild(btn);
  });

  const apts = appointmentsFor(d);
  if (apts.length === 0) summary.textContent = "Nemaš termina";
  else {
    const total = apts.filter(a=>a.status!=="cancelled").reduce((s,a)=>s+appointmentTotal(a),0);
    summary.textContent = `${apts.length} ${apts.length===1?"termin":"termina"} · ${formatMoney(total)}`;
  }

  list.innerHTML = "";
  if (apts.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="3"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <p class="empty-title">Slobodan dan</p>
        <p class="empty-message">Nema zakazanih termina.</p>
      </div>`;
  } else {
    apts.forEach(apt => list.appendChild(renderAppointmentCard(apt)));
  }

  backBtn.classList.toggle("hidden", isToday(d));
}

function renderAppointmentCard(apt) {
  const client = clientById(apt.clientId);
  const total = appointmentTotal(apt);
  const card = document.createElement("div");
  card.className = "appointment-card";
  if (apt.status === "completed") card.classList.add("completed");
  if (apt.status === "cancelled") card.classList.add("cancelled");

  const d = new Date(apt.date);
  const timeClass = apt.status === "completed" ? "appointment-time completed-time" : "appointment-time";
  let badge = "";
  if (isAwaitingPayment(apt)) badge = `<div class="appointment-badge">Čeka naplatu</div>`;

  // Specijalni prikaz za "Slobodan Termin"
  if (isFakeAppointment(apt)) {
    card.innerHTML = `
      <div class="appointment-row-1">
        <span class="appointment-time">${formatTime(d)}</span>
      </div>
      <div class="appointment-name">— Slobodan termin —</div>
      <div class="appointment-services">Slobodno za zakazivanje</div>`;
    card.style.opacity = "0.75";
    card.onclick = () => openAppointmentDetail(apt.id);
    return card;
  }

  card.innerHTML = `
    <div class="appointment-row-1">
      <span class="${timeClass}">${formatTime(d)}</span>
      <span class="appointment-price">${formatMoney(total)}</span>
    </div>
    <div class="appointment-name">${client ? client.firstName + " " + client.lastName : "—"}</div>
    <div class="appointment-services">${apt.services.map(s=>s.name).join(", ")}</div>
    ${badge}`;
  card.onclick = () => openAppointmentDetail(apt.id);
  return card;
}

// ============================================================
// RENDER — KLIJENTKINJE
// ============================================================
let clientSearchQuery = "";

function renderClients() {
  const list = document.getElementById("clients-list");
  const active = state.clients.filter(c=>!c.isArchived);
  const q = clientSearchQuery.toLowerCase().trim();
  const filtered = q ? active.filter(c=>(c.firstName+c.lastName).toLowerCase().includes(q)) : active;

  filtered.sort((a,b) => {
    const an = nextAppointmentFor(a.id), bn = nextAppointmentFor(b.id);
    if (an && bn) return new Date(an.date) - new Date(bn.date);
    if (an) return -1; if (bn) return 1;
    const al = lastCompletedFor(a.id), bl = lastCompletedFor(b.id);
    if (al && bl) return new Date(bl.date) - new Date(al.date);
    if (al) return -1; if (bl) return 1;
    return a.firstName.localeCompare(b.firstName, "sr");
  });

  list.innerHTML = "";
  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
        </svg>
        <p class="empty-title">${q ? "Nema rezultata" : "Nema klijentkinja"}</p>
        <p class="empty-message">${q ? "Probaj drugu reč." : "Dodaj prvu pomoću + gore."}</p>
      </div>`;
    return;
  }

  filtered.forEach((client, i) => {
    const next = nextAppointmentFor(client.id);
    const visits = state.appointments.filter(a=>a.clientId===client.id && a.status==="completed").length;
    const revenue = clientPaidRevenue(client.id);

    const card = document.createElement("div");
    card.className = "client-card";
    card.style.animationDelay = `${i*0.03}s`;
    const nextText = next
      ? `${formatTime(new Date(next.date))} · ${new Date(next.date).getDate()}. ${MONTHS_SHORT[new Date(next.date).getMonth()]}`
      : "Nema zakazano";

    card.innerHTML = `
      <div class="client-row-1">
        <div style="flex:1; min-width:0;">
          <div class="client-name">${client.firstName} ${client.lastName}</div>
          <div class="client-next ${next?"":"empty"}">${nextText}</div>
        </div>
        <div class="avatar">${initials(client)}</div>
      </div>
      <div class="client-stats">${visits} poseta · ${formatMoney(revenue)}</div>`;
    card.onclick = () => openClientProfile(client.id);
    list.appendChild(card);
  });
}

// ============================================================
// PROFIL KLIJENTKINJE
// ============================================================
let profileShowAll = false;

function openClientProfile(clientId) {
  state.profileClientId = clientId;
  profileShowAll = false;
  showTab("clients");
  showScreen("client-profile");
  renderClientProfile();
}

function renderClientProfile() {
  const client = clientById(state.profileClientId);
  if (!client) return;
  document.getElementById("profile-name").textContent = client.firstName;

  const next = nextAppointmentFor(client.id);
  const completed = state.appointments.filter(a=>a.clientId===client.id && a.status==="completed").sort((a,b)=>new Date(b.date)-new Date(a.date));
  const cancelled = state.appointments.filter(a=>a.clientId===client.id && a.status==="cancelled").sort((a,b)=>new Date(b.date)-new Date(a.date));

  const visits = completed.length;
  const paid = clientPaidRevenue(client.id);
  const unpaid = clientUnpaidTotal(client.id);
  const allHistory = [...completed, ...cancelled];
  const shown = profileShowAll ? allHistory : allHistory.slice(0, 8);

  let html = `<div class="profile-hero">
    <div class="profile-avatar">${initials(client)}</div>
    ${client.phone ? `<a href="tel:${client.phone.replace(/\s/g,"")}" class="profile-phone">${client.phone}</a>` : ""}
  </div>`;

  if (next) {
    const nd = new Date(next.date);
    html += `<div>
      <div class="section-title">Sledeći termin</div>
      <div class="next-card">
        <div class="next-card-time">${formatTime(nd)}</div>
        <div class="next-card-date">${capitalize(DAYS_LONG[nd.getDay()])}, ${nd.getDate()}. ${MONTHS[nd.getMonth()]}</div>
        <div class="next-card-services">${next.services.map(s=>s.name).join(", ")} · ${formatMoney(appointmentTotal(next))}</div>
      </div>
    </div>`;
  }

  html += `<button class="btn btn-primary" onclick="openNewAppointmentSheet('${client.id}')">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    Zakaži termin
  </button>`;

  html += `<div>
    <div class="section-title">Ukupno</div>
    <div class="stat-grid">
      <div class="stat-box"><div class="stat-label">Poseta</div><div class="stat-value">${visits}</div></div>
      <div class="stat-box"><div class="stat-label">Naplaćeno</div><div class="stat-value" style="font-size:20px;">${formatMoneyShort(paid)}<span style="font-size:13px;color:var(--text-3);font-weight:500;margin-left:4px;">RSD</span></div></div>
    </div>
    ${unpaid>0 ? `<div class="unpaid-card" style="margin-top:12px;"><div class="unpaid-header"><div class="unpaid-title">Čeka naplatu</div><div class="unpaid-total">${formatMoney(unpaid)}</div></div></div>` : ""}
  </div>`;

  if (allHistory.length > 0) {
    html += `<div><div class="section-title">Istorija</div><div class="history-list">`;
    shown.forEach(apt => {
      const d = new Date(apt.date);
      const statusText = apt.status === "completed"
        ? (apt.paymentStatus === "paid" ? "✓ Plaćeno" : "⏳ Nije plaćeno")
        : "✕ Otkazano";
      const statusClass = apt.status === "completed"
        ? (apt.paymentStatus === "paid" ? "paid" : "unpaid")
        : "cancelled";
      html += `<div class="history-item">
        <div class="history-item-left">
          <div class="history-item-date">${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}</div>
          <div class="history-item-service">${apt.services.map(s=>s.name).join(", ")}</div>
          <div class="history-item-status ${statusClass}">${statusText}</div>
        </div>
        <div class="history-item-price">${formatMoney(appointmentTotal(apt))}</div>
      </div>`;
    });
    if (allHistory.length > 8 && !profileShowAll) {
      html += `<div class="history-show-all" onclick="expandHistory()">Prikaži sve (${allHistory.length})</div>`;
    }
    html += `</div></div>`;
  }

  if (client.note) {
    html += `<div><div class="section-title">Napomena</div><div class="note-card">${client.note}</div></div>`;
  }

  document.getElementById("profile-content").innerHTML = html;
}

function expandHistory() { profileShowAll = true; renderClientProfile(); }

// ============================================================
// ZARADA
// ============================================================
function renderRevenue() {
  const el = document.getElementById("revenue-content");
  const today = todayRevenue();
  const week = weekRevenue();
  const month = monthRevenue();
  const unpaid = unpaidTotal();
  const unpaidList = unpaidAppointments();
  const completedCount = state.appointments.filter(a=>a.status==="completed").length;
  const paidCount = state.appointments.filter(isPaidCompleted).length;
  const clientCount = new Set(state.appointments.map(a=>a.clientId)).size;

  const serviceCount = {};
  state.appointments.filter(a=>a.status==="completed").forEach(a=>a.services.forEach(s=>{serviceCount[s.name]=(serviceCount[s.name]||0)+1;}));
  const topService = Object.entries(serviceCount).sort((a,b)=>b[1]-a[1])[0]?.[0] || "—";

  let html = `<div class="revenue-hero">
    <div class="revenue-hero-label">Ovaj mesec</div>
    <div class="revenue-hero-value">
      <span>${formatMoneyShort(month)}</span>
      <span class="revenue-hero-unit">RSD</span>
    </div>
  </div>
  <div class="revenue-grid">
    <div class="revenue-box"><div class="revenue-box-label">Danas</div><div class="revenue-box-value">${formatMoneyShort(today)}</div></div>
    <div class="revenue-box"><div class="revenue-box-label">Ove nedelje</div><div class="revenue-box-value">${formatMoneyShort(week)}</div></div>
  </div>`;

  if (unpaidList.length > 0) {
    html += `<div class="unpaid-card"><div class="unpaid-header"><div class="unpaid-title">Čeka naplatu</div><div class="unpaid-total">${formatMoney(unpaid)}</div></div><div class="unpaid-list">`;
    unpaidList.forEach(apt => {
      const d = new Date(apt.date);
      const client = clientById(apt.clientId);
      html += `<div class="unpaid-item" onclick="openAppointmentDetail('${apt.id}')" style="cursor:pointer;">
        <div><div class="unpaid-item-name">${client ? client.firstName + " " + client.lastName : "—"}</div><div class="unpaid-item-date">${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}</div></div>
        <div class="unpaid-item-amount">${formatMoneyShort(appointmentTotal(apt))} RSD</div>
      </div>`;
    });
    html += `</div></div>`;
  }

  html += `<div class="section-title">Statistika</div><div class="stats-list">
    <div class="stats-row"><span class="stats-row-label">Završenih termina</span><span class="stats-row-value">${completedCount}</span></div>
    <div class="stats-row"><span class="stats-row-label">Plaćenih termina</span><span class="stats-row-value">${paidCount}</span></div>
    <div class="stats-row"><span class="stats-row-label">Broj klijentkinja</span><span class="stats-row-value">${clientCount}</span></div>
    <div class="stats-row"><span class="stats-row-label">Najpopularnija usluga</span><span class="stats-row-value">${topService}</span></div>
  </div>`;

  el.innerHTML = html;
}

// ============================================================
// CENOVNIK
// ============================================================
function renderPricelist() {
  const el = document.getElementById("pricelist-content");
  const services = state.services.filter(s=>!s.isArchived).sort((a,b)=>a.sortOrder-b.sortOrder);
  if (services.length === 0) {
    el.innerHTML = `<div class="empty-state"><p class="empty-title">Prazan cenovnik</p><p class="empty-message">Dodaj prvu uslugu pomoću + gore.</p></div>`;
    return;
  }
  el.innerHTML = "";
  services.forEach(svc => {
    const card = document.createElement("div");
    card.className = "price-card";
    card.innerHTML = `<div class="price-card-name">${svc.name}</div><div class="price-card-price">${formatMoney(svc.price)}</div>`;
    card.onclick = () => openServiceEditSheet(svc.id);
    el.appendChild(card);
  });
}

// ============================================================
// SCREEN NAVIGATION
// ============================================================
function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  const el = document.getElementById(`screen-${name}`);
  if (el) el.classList.add("active");
  document.getElementById("main-content").scrollTop = 0;
}

function showTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active", t.dataset.tab===tab));
  if (tab === "today") { showScreen("today"); renderToday(); }
  else if (tab === "clients") { showScreen("clients"); renderClients(); }
  else if (tab === "revenue") { showScreen("revenue"); renderRevenue(); }
  else if (tab === "settings") { showScreen("settings"); updateSettingsSub(); }
  updateNewAppointmentButton();
}

function updateNewAppointmentButton() {
  const btn = document.getElementById("btn-new-appointment");
  btn.classList.toggle("hidden", state.currentTab !== "today");
}

function updateSettingsSub() {
  const active = state.services.filter(s=>!s.isArchived).length;
  document.getElementById("settings-pricelist-sub").textContent = `${active} ${active===1?"usluga":"usluge"}`;
  document.getElementById("settings-work-hours-sub").textContent = `${String(state.settings.workStart).padStart(2,"0")}:00 — ${String(state.settings.workEnd).padStart(2,"0")}:00`;

  const backupSub = document.getElementById("settings-backup-sub");
  if (!JSONBIN_MASTER_KEY) backupSub.textContent = "Nije postavljen";
  else if (!state.settings.cloudBackupEnabled) backupSub.textContent = "Isključen";
  else if (lastBackupTime) backupSub.textContent = `Poslednji: ${formatTime(lastBackupTime)}`;
  else backupSub.textContent = "Aktivan";
}

function updateBackupStatus() { updateSettingsSub(); }

// ============================================================
// NOVI / IZMENI TERMIN
// ============================================================
let newApptState = null;

function openNewAppointmentSheet(preselectClientId) {
  const baseDate = state.selectedDate ? startOfDay(state.selectedDate) : startOfDay(new Date());
  newApptState = {
    mode: "new",
    editingId: null,
    replacesFakeId: null,
    step: "calendar",
    date: null,
    displayedMonth: new Date(baseDate.getFullYear(), baseDate.getMonth(), 1),
    time: null,
    clientId: preselectClientId || null,
    services: [],
    fromProfile: !!preselectClientId
  };
  renderNewAppointmentSheet();
}

function openEditAppointment(appointmentId) {
  const apt = state.appointments.find(a => a.id === appointmentId);
  if (!apt) return;
  if (apt.status !== "scheduled") {
    toast("Ne može da se menja završen ili otkazan termin");
    return;
  }

  const d = new Date(apt.date);
  newApptState = {
    mode: "edit",
    editingId: appointmentId,
    replacesFakeId: null,
    step: "time",
    date: startOfDay(d),
    displayedMonth: new Date(d.getFullYear(), d.getMonth(), 1),
    time: minutesFromDate(d),
    clientId: apt.clientId,
    services: apt.services.map(s => ({ ...s })),
    fromProfile: false
  };
  closeSheet();
  setTimeout(() => renderNewAppointmentSheet(), 300);
}

function renderNewAppointmentSheet() {
  const s = newApptState;
  const isEdit = s.mode === "edit";
  let html = `<div class="sheet-grabber"></div>
    <div class="sheet-header">
      <div class="sheet-title">${isEdit ? "Izmeni termin" : "Novi termin"}</div>
      <button class="sheet-close" onclick="closeSheet()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="sheet-body">`;

  const badges = [];
  if (s.date) {
    badges.push({
      text: `${capitalize(DAYS_LONG[s.date.getDay()])}, ${s.date.getDate()}. ${MONTHS_SHORT[s.date.getMonth()]}`,
      action: "changeDate"
    });
  }
  if (s.time !== null) {
    badges.push({ text: formatMinutes(s.time), action: "changeTime" });
  }
  if (s.clientId) {
    const c = clientById(s.clientId);
    if (c) badges.push({ text: `${c.firstName}`, action: "changeClient" });
  }
  if (badges.length > 0) {
    html += `<div class="picked-row">`;
    badges.forEach(b => {
      html += `<div class="picked-badge">${b.text}<button onclick="newAppt_${b.action}()">Promeni</button></div>`;
    });
    html += `</div>`;
  }

  if (s.step === "calendar") {
    html += renderCalendarStep();
  } else if (s.step === "time") {
    html += `<div class="sheet-section"><div class="sheet-section-label">U koliko</div>`;
    html += renderTimeGrid();
    html += `</div>`;
  } else if (s.step === "client") {
    html += `<div class="sheet-section"><div class="sheet-section-label">Klijentkinja</div>`;
    html += renderClientPicker();
    html += `</div>`;
  } else if (s.step === "services") {
    html += `<div class="sheet-section"><div class="sheet-section-label">Usluge</div>`;
    html += renderServicePicker();
    html += `</div>`;

    if (s.services.length > 0) {
      const total = s.services.reduce((sum, x) => sum + x.price, 0);
      html += `<div class="sheet-total">
        <div class="sheet-total-label">Ukupno</div>
        <div class="sheet-total-value">${formatMoney(total)}</div>
      </div>
      <button class="btn btn-primary" onclick="newApptConfirm()">${isEdit ? "Sačuvaj izmene" : "Zakaži termin"}</button>`;
    }
  }

  html += `</div>`;
  openSheet(html);
}

function renderCalendarStep() {
  const s = newApptState;
  const month = s.displayedMonth;
  const year = month.getFullYear();
  const m = month.getMonth();

  let html = `<div class="calendar">`;

  html += `<div class="calendar-header">
    <button class="calendar-nav" onclick="calendarPrevMonth()" aria-label="Prethodni mesec">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <div class="calendar-title">${MONTHS[m]} ${year}</div>
    <button class="calendar-nav" onclick="calendarNextMonth()" aria-label="Sledeći mesec">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  </div>`;

  html += `<div class="calendar-weekdays">
    <span class="calendar-weekday">Pon</span>
    <span class="calendar-weekday">Uto</span>
    <span class="calendar-weekday">Sre</span>
    <span class="calendar-weekday">Čet</span>
    <span class="calendar-weekday">Pet</span>
    <span class="calendar-weekday">Sub</span>
    <span class="calendar-weekday">Ned</span>
  </div>`;

  const firstOfMonth = new Date(year, m, 1);
  const firstDow = firstOfMonth.getDay();
  const diffToMonday = firstDow === 0 ? -6 : 1 - firstDow;
  const startDate = addDays(firstOfMonth, diffToMonday);
  const today = startOfDay(new Date());

  html += `<div class="calendar-grid">`;
  for (let i = 0; i < 42; i++) {
    const day = addDays(startDate, i);
    const dayStart = startOfDay(day);
    const inMonth = day.getMonth() === m;
    const isSelected = s.date && sameDay(day, s.date);
    const isTodayCell = sameDay(day, new Date());
    const isPast = dayStart < today;
    const hasAppts = dayHasAppointments(day);

    let cls = "calendar-day";
    if (!inMonth) cls += " other-month";
    if (isSelected) cls += " selected";
    if (isTodayCell && !isSelected) cls += " today";
    if (isPast && !isTodayCell) cls += " past";
    if (hasAppts) cls += " has-appts";

    const disabled = isPast && !isTodayCell;

    html += `<button class="${cls}" onclick="${disabled ? '' : `calendarPickDay(${day.getTime()})`}">
      <span>${day.getDate()}</span>
    </button>`;
  }
  html += `</div></div>`;

  return html;
}

function renderTimeGrid() {
  const s = newApptState;
  const start = state.settings.workStart * 60;
  const end = state.settings.workEnd * 60;

  // Svi zakazani termini za taj dan
  const dayAppts = state.appointments.filter(a => {
    if (a.status !== "scheduled") return false;
    return sameDay(new Date(a.date), s.date);
  });

  // "Slobodan Termin" sati (Jelenini radni sati)
  const fakeSlots = dayAppts
    .filter(a => isFakeAppointment(a))
    .map(a => minutesFromDate(new Date(a.date)));

  // Pravi termini (zauzeti sati)
  const realSlots = dayAppts
    .filter(a => !isFakeAppointment(a))
    .map(a => minutesFromDate(new Date(a.date)));

  // Logika: ako dan ima bar jedan "Slobodan Termin" → samo ti sati su radni
  // Ako nema → svi sati su radni (default ponašanje)
  const hasFakeSlots = fakeSlots.length > 0;
  const workingSlots = hasFakeSlots
    ? new Set([...fakeSlots, ...realSlots])
    : null;

  const isWorking = (m) => workingSlots === null || workingSlots.has(m);

  // Provera da li ima ijedan slobodan radni sat
  let hasFree = false;
  for (let m = start; m < end; m += 30) {
    if (isWorking(m) && !isSlotBusy(s.date, m)) { hasFree = true; break; }
  }

  if (!hasFree) {
    return `<div class="time-empty">Nema slobodnih sati za ovaj dan.</div>`;
  }

  // Hint iznad grid-a (samo ako dan ima definisane radne sate)
  let html = "";
  if (hasFakeSlots) {
    const sorted = [...workingSlots].sort((a,b) => a-b);
    const times = sorted.map(m => formatMinutes(m)).join(", ");
    html += `<div style="font-size:13px; color:var(--success); margin-bottom:10px; padding-left:4px; font-weight:600;">
      Radiš: ${times}
    </div>`;
  }

  html += `<div class="time-grid">`;
  for (let m = start; m < end; m += 30) {
    const working = isWorking(m);
    const busy = isSlotBusy(s.date, m);
    const sel = s.time === m;

    if (!working) {
      html += `<button class="time-chip off" disabled>${formatMinutes(m)}</button>`;
    } else if (busy) {
      html += `<button class="time-chip busy" disabled>${formatMinutes(m)}</button>`;
    } else {
      html += `<button class="time-chip ${sel ? "selected" : ""}" onclick="newApptPickTime(${m})">${formatMinutes(m)}</button>`;
    }
  }
  html += `</div>`;
  return html;
}

function renderClientPicker() {
  const s = newApptState;
  let html = `<div class="chip-grid">`;

  const sortedClients = state.clients
    .filter(c => !c.isArchived)
    .sort((a, b) => {
      const aLast = lastCompletedFor(a.id);
      const bLast = lastCompletedFor(b.id);
      if (aLast && bLast) return new Date(bLast.date) - new Date(aLast.date);
      if (aLast) return -1;
      if (bLast) return 1;
      return a.firstName.localeCompare(b.firstName, "sr");
    });

  sortedClients.slice(0, 12).forEach(c => {
    const sel = c.id === s.clientId;
    html += `<button class="chip ${sel ? "selected" : ""}" onclick="newApptPickClient('${c.id}')">${c.firstName} ${c.lastName}</button>`;
  });
  html += `<button class="chip add-chip" onclick="openNewClientSheet(true)">+ Nova</button>`;
  html += `</div>`;
  return html;
}

function renderServicePicker() {
  const s = newApptState;
  let html = `<div class="chip-grid">`;
  state.services
    .filter(sv => !sv.isArchived)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach(sv => {
      const sel = s.services.some(x => x.name === sv.name);
      html += `<button class="chip ${sel ? "selected" : ""}" onclick="newApptToggleService('${sv.id}')">${sv.name}<span class="chip-sub">${formatMoneyShort(sv.price)}</span></button>`;
    });
  html += `</div>`;
  return html;
}

function calendarPrevMonth() {
  const m = newApptState.displayedMonth;
  newApptState.displayedMonth = new Date(m.getFullYear(), m.getMonth() - 1, 1);
  renderNewAppointmentSheet();
}

function calendarNextMonth() {
  const m = newApptState.displayedMonth;
  newApptState.displayedMonth = new Date(m.getFullYear(), m.getMonth() + 1, 1);
  renderNewAppointmentSheet();
}

function calendarPickDay(ts) {
  const s = newApptState;
  const day = startOfDay(new Date(ts));
  s.date = day;
  if (s.mode !== "edit") {
    s.time = null;
    s.services = [];
    if (!s.fromProfile) s.clientId = null;
  }
  s.step = "time";
  renderNewAppointmentSheet();
}

function newApptPickTime(m) {
  const s = newApptState;

  // Ako je ovaj sat "Slobodan Termin" — zapamti da ga treba zameniti
  const fakeAtThisTime = state.appointments.find(a => {
    if (a.status !== "scheduled") return false;
    if (!isFakeAppointment(a)) return false;
    return sameDay(new Date(a.date), s.date) && minutesFromDate(new Date(a.date)) === m;
  });
  s.replacesFakeId = fakeAtThisTime ? fakeAtThisTime.id : null;

  if (s.time === m && (s.step === "time")) {
    s.step = s.clientId ? "services" : "client";
    renderNewAppointmentSheet();
    return;
  }
  s.time = m;
  if (s.mode !== "edit") s.services = [];
  s.step = s.clientId ? "services" : "client";
  renderNewAppointmentSheet();
}

function newApptPickClient(clientId) {
  const s = newApptState;
  s.clientId = clientId;
  if (s.mode !== "edit") s.services = [];
  s.step = "services";
  renderNewAppointmentSheet();
}

function newApptToggleService(id) {
  const svc = state.services.find(s => s.id === id);
  if (!svc) return;
  const idx = newApptState.services.findIndex(x => x.name === svc.name);
  if (idx >= 0) newApptState.services.splice(idx, 1);
  else newApptState.services.push({ name: svc.name, price: svc.price });
  renderNewAppointmentSheet();
}

function newAppt_changeDate() {
  newApptState.step = "calendar";
  if (newApptState.mode !== "edit") {
    newApptState.time = null;
    newApptState.services = [];
  }
  renderNewAppointmentSheet();
}

function newAppt_changeTime() {
  newApptState.step = "time";
  if (newApptState.mode !== "edit") newApptState.services = [];
  renderNewAppointmentSheet();
}

function newAppt_changeClient() {
  newApptState.step = "client";
  if (newApptState.mode !== "edit") newApptState.services = [];
  renderNewAppointmentSheet();
}

function newApptConfirm() {
  const s = newApptState;
  if (!s.clientId || s.time === null || s.services.length === 0 || !s.date) return;

  const conflict = state.appointments.find(a => {
    if (a.status !== "scheduled") return false;
    if (s.mode === "edit" && a.id === s.editingId) return false;
    if (s.replacesFakeId && a.id === s.replacesFakeId) return false;
    if (isFakeAppointment(a)) return false; // ne blokiraj zbog "Slobodan Termin"
    const d = new Date(a.date);
    return sameDay(d, s.date) && minutesFromDate(d) === s.time;
  });

  if (conflict) {
    const other = clientById(conflict.clientId);
    const newClient = clientById(s.clientId);
    openOverlapWarning(other, newClient, () => commitNewAppointment());
    return;
  }
  commitNewAppointment();
}

function commitNewAppointment() {
  const s = newApptState;
  const date = new Date(s.date);
  date.setHours(Math.floor(s.time / 60), s.time % 60, 0, 0);

  // Ako menjamo "Slobodan Termin" — obriši ga
  if (s.replacesFakeId) {
    const idx = state.appointments.findIndex(a => a.id === s.replacesFakeId);
    if (idx >= 0) state.appointments.splice(idx, 1);
  }

  if (s.mode === "edit" && s.editingId) {
    const apt = state.appointments.find(a => a.id === s.editingId);
    if (apt) {
      apt.date = date.toISOString();
      apt.clientId = s.clientId;
      apt.services = s.services;
      saveState();
      closeSheet();
      toast("Izmena sačuvana");
      renderToday();
      renderClients();
      if (state.profileClientId) renderClientProfile();
      return;
    }
  }

  state.appointments.push({
    id: "a" + Date.now(),
    date: date.toISOString(),
    clientId: s.clientId,
    services: s.services,
    status: "scheduled",
    paymentStatus: "unpaid"
  });
  saveState();
  closeSheet();
  toast("Termin zakazan");
  renderToday();
  renderClients();
}

function isSlotBusy(date, minutes) {
  if (!date) return false;
  const editingId = newApptState?.editingId;
  const replacesFakeId = newApptState?.replacesFakeId;
  return state.appointments.some(a => {
    if (a.status !== "scheduled") return false;
    if (editingId && a.id === editingId) return false;
    if (replacesFakeId && a.id === replacesFakeId) return false;
    if (isFakeAppointment(a)) return false; // "Slobodan Termin" nije zauzet
    const d = new Date(a.date);
    return sameDay(d, date) && minutesFromDate(d) === minutes;
  });
}

function openOverlapWarning(otherClient, newClient, onConfirm) {
  const html = `<div class="sheet-grabber"></div>
    <div class="sheet-body" style="padding-top:16px;">
      <div class="warning-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
      <div class="warning-title">Već imaš termin</div>
      <div class="warning-message"><strong>${otherClient.firstName} ${otherClient.lastName}</strong> već ima termin u <strong>${formatMinutes(newApptState.time)}</strong>.<br><br>Sigurno želiš da zakažeš <strong>${newClient.firstName} ${newClient.lastName}</strong> u isto vreme?</div>
      <div class="btn-row"><button class="btn btn-secondary" onclick="closeSheet()">Promeni vreme</button><button class="btn btn-primary" onclick="window._overlapConfirm()">Zakaži</button></div>
    </div>`;
  window._overlapConfirm = () => { onConfirm(); window._overlapConfirm = null; };
  openSheet(html);
}

// ============================================================
// NOVA KLIJENTKINJA
// ============================================================
let newClientReturnToAppt = false;

function openNewClientSheet(returnToAppt = false) {
  newClientReturnToAppt = returnToAppt;
  const html = `<div class="sheet-grabber"></div>
    <div class="sheet-header"><div class="sheet-title">Nova klijentkinja</div>
      <button class="sheet-close" onclick="closeSheet()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="sheet-body">
      <div class="field-row">
        <div class="field"><label class="field-label">Ime</label><input class="field-input" id="new-client-first" type="text" autocomplete="off"></div>
        <div class="field"><label class="field-label">Prezime</label><input class="field-input" id="new-client-last" type="text" autocomplete="off"></div>
      </div>
      <div class="field"><label class="field-label">Telefon (opciono)</label><input class="field-input" id="new-client-phone" type="tel" autocomplete="off"></div>
      <div class="field"><label class="field-label">Napomena (opciono)</label><input class="field-input" id="new-client-note" type="text" autocomplete="off"></div>
      <button class="btn btn-primary" onclick="saveNewClient()">Sačuvaj</button>
    </div>`;
  openSheet(html);
  setTimeout(()=>document.getElementById("new-client-first")?.focus(), 350);
}

function saveNewClient() {
  const firstName = document.getElementById("new-client-first").value.trim();
  const lastName = document.getElementById("new-client-last").value.trim();
  const phone = document.getElementById("new-client-phone").value.trim();
  const note = document.getElementById("new-client-note").value.trim();

  if (!firstName || !lastName) { toast("Unesi ime i prezime"); return; }

  const dup = state.clients.find(c => !c.isArchived && c.firstName.toLowerCase()===firstName.toLowerCase() && c.lastName.toLowerCase()===lastName.toLowerCase());
  if (dup) {
    if (!confirm(`Već imaš ${dup.firstName} ${dup.lastName}. Sigurno želiš drugu?`)) return;
  }

  const client = { id:"c"+Date.now(), firstName, lastName, phone, note, isArchived:false };
  state.clients.push(client);
  saveState();

  if (newClientReturnToAppt) {
    newApptState.clientId = client.id;
    newApptState.services = [];
    newApptState.step = "services";
    renderNewAppointmentSheet();
  } else {
    closeSheet();
    toast("Klijentkinja dodata");
    renderClients();
  }
}

// ============================================================
// DETALJ TERMINA (i "Slobodan Termin")
// ============================================================
let currentAptId = null;

function openAppointmentDetail(aptId) {
  currentAptId = aptId;
  const apt = state.appointments.find(a => a.id === aptId);
  if (isFakeAppointment(apt)) {
    renderFakeAppointmentSheet(apt);
    return;
  }
  renderAppointmentDetailSheet();
}

function renderFakeAppointmentSheet(apt) {
  const d = new Date(apt.date);
  const dayLabel = `${capitalize(DAYS_LONG[d.getDay()])}, ${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;

  const html = `<div class="sheet-grabber"></div>
    <div class="sheet-header">
      <div class="sheet-title">Slobodan termin</div>
      <button class="sheet-close" onclick="closeSheet()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="sheet-body">
      <div class="detail-hero">
        <div class="detail-time">${formatTime(d)}</div>
        <div class="detail-date">${dayLabel}</div>
      </div>

      <p style="text-align:center; color:var(--text-2); font-size:15px; line-height:1.5; margin-bottom:24px;">
        Ovaj sat je označen kao slobodan.<br>Želiš li da zakažeš klijentkinju?
      </p>

      <button class="btn btn-primary" onclick="fakeApptStartBooking('${apt.id}')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Zakaži klijentkinju
      </button>
      <button class="btn btn-secondary" style="margin-top:12px;" onclick="fakeApptRemove('${apt.id}')">
        Oslobodi sat
      </button>
      <button class="btn btn-secondary" style="margin-top:12px; background:transparent; color:var(--text-2);" onclick="closeSheet()">
        Zatvori
      </button>
    </div>`;
  openSheet(html);
}

function fakeApptStartBooking(fakeId) {
  const fake = state.appointments.find(a => a.id === fakeId);
  if (!fake) return;
  const d = new Date(fake.date);
  closeSheet();

  setTimeout(() => {
    openNewAppointmentSheet();
    newApptState.date = startOfDay(d);
    newApptState.displayedMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    newApptState.time = minutesFromDate(d);
    newApptState.replacesFakeId = fakeId;
    newApptState.step = "client";
    renderNewAppointmentSheet();
  }, 350);
}

function fakeApptRemove(fakeId) {
  const idx = state.appointments.findIndex(a => a.id === fakeId);
  if (idx < 0) return;
  const backup = state.appointments[idx];
  state.appointments.splice(idx, 1);
  saveState();
  closeSheet();
  toastUndo("Sat oslobođen", () => {
    state.appointments.push(backup);
    saveState();
    renderToday();
  });
  renderToday();
}

function renderAppointmentDetailSheet() {
  const apt = state.appointments.find(a=>a.id===currentAptId);
  if (!apt) return;
  const client = clientById(apt.clientId);
  const d = new Date(apt.date);
  const total = appointmentTotal(apt);

  let html = `<div class="sheet-grabber"></div>
    <div class="sheet-header"><div class="sheet-title">Termin</div>
      <button class="sheet-close" onclick="closeSheet()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="sheet-body">
      <div class="detail-hero">
        <div class="detail-time">${formatTime(d)}</div>
        <div class="detail-date">${capitalize(DAYS_LONG[d.getDay()])}, ${d.getDate()}. ${MONTHS[d.getMonth()]}</div>
      </div>`;

  if (client) {
    html += `<div class="detail-client-card">
      <div class="avatar">${initials(client)}</div>
      <div class="detail-client-info">
        <div class="detail-client-name">${client.firstName} ${client.lastName}</div>
        ${client.phone ? `<div class="detail-client-phone">${client.phone}</div>` : ""}
      </div>
    </div>`;
  }

  html += `<div class="detail-services">
    ${apt.services.map(s=>`<div class="detail-service-row"><span class="detail-service-name">${s.name}</span><span class="detail-service-price">${formatMoney(s.price)}</span></div>`).join("")}
  </div>
  <div class="detail-total"><span class="detail-total-label">Ukupno</span><span class="detail-total-value">${formatMoney(total)}</span></div>`;

  if (apt.status === "scheduled") {
    html += `<button class="btn btn-success" onclick="openCompletionSheet()">Završeno</button>
      <button class="btn btn-secondary" style="margin-top:12px;" onclick="sendReminder()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        Pošalji podsetnik
      </button>
      <div class="btn-row">
        <button class="btn btn-secondary" onclick="openEditAppointment('${apt.id}')">Izmeni</button>
        <button class="btn btn-danger" onclick="cancelAppointment()">Otkaži</button>
      </div>`;
  } else if (apt.status === "completed") {
    if (apt.paymentStatus === "unpaid") {
      html += `<div class="unpaid-card" style="margin-bottom:20px;"><div class="unpaid-header"><div class="unpaid-title">Čeka naplatu</div><div class="unpaid-total">${formatMoney(total)}</div></div></div>
        <button class="btn btn-success" onclick="markAsPaid()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Označi kao plaćeno
        </button>`;
    } else {
      html += `<div class="stat-box" style="background:var(--success-bg);box-shadow:none;text-align:center;padding:20px;"><div style="color:var(--success);font-weight:700;font-size:16px;">✓ Plaćeno</div></div>`;
    }
  } else if (apt.status === "cancelled") {
    html += `<div class="stat-box" style="background:var(--surface-2);box-shadow:none;text-align:center;padding:20px;"><div style="color:var(--text-2);font-weight:600;">Otkazano</div></div>`;
  }

  if (apt.status !== "scheduled") {
    html += `<button class="btn btn-secondary" style="margin-top:16px;color:var(--danger);" onclick="deleteAppointment()">Obriši termin</button>`;
  }

  html += `</div>`;
  openSheet(html);
}

function cancelAppointment() {
  const apt = state.appointments.find(a=>a.id===currentAptId);
  if (!apt) return;
  const prevStatus = apt.status;
  apt.status = "cancelled";
  saveState();
  closeSheet();
  toastUndo("Termin otkazan", () => {
    apt.status = prevStatus;
    saveState();
    renderToday();
    renderClients();
    if (state.currentTab === "revenue") renderRevenue();
  });
  renderToday();
  renderClients();
  if (state.currentTab === "revenue") renderRevenue();
}

function deleteAppointment() {
  const idx = state.appointments.findIndex(a=>a.id===currentAptId);
  if (idx < 0) return;
  const backup = state.appointments[idx];
  state.appointments.splice(idx, 1);
  saveState();
  closeSheet();
  toastUndo("Termin obrisan", () => {
    state.appointments.push(backup);
    saveState();
    renderToday();
    renderClients();
    if (state.currentTab === "revenue") renderRevenue();
  });
  renderToday();
  renderClients();
  if (state.currentTab === "revenue") renderRevenue();
}

function sendReminder() {
  const apt = state.appointments.find(a=>a.id===currentAptId);
  if (!apt) return;
  const client = clientById(apt.clientId);
  const d = new Date(apt.date);
  const dateStr = `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
  const text = `${client.firstName}, tvoj sledeći termin:\n${dateStr}. u ${formatTime(d)}\nVidimo se! 💅`;

  if (navigator.share) {
    navigator.share({ text }).catch(()=>{});
  } else {
    navigator.clipboard.writeText(text).then(()=>toast("Kopirano"));
  }
}

// ============================================================
// ZAVRŠENO + PLAĆANJE
// ============================================================
function openCompletionSheet() {
  const apt = state.appointments.find(a=>a.id===currentAptId);
  if (!apt) return;
  const total = appointmentTotal(apt);

  const html = `<div class="sheet-grabber"></div>
    <div class="sheet-body" style="padding-top:12px;">
      <div class="success-hero">
        <div class="success-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div class="success-title">Završeno</div>
        <div class="success-sub">Da li je plaćeno?</div>
      </div>
      <div class="payment-choice">
        <button class="payment-btn paid" onclick="completeWithPayment('paid')">
          <svg class="payment-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>
          <div class="payment-btn-label">Plaćeno</div>
          <div class="payment-btn-sub">${formatMoney(total)}</div>
        </button>
        <button class="payment-btn unpaid" onclick="completeWithPayment('unpaid')">
          <svg class="payment-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <div class="payment-btn-label">Nije plaćeno</div>
          <div class="payment-btn-sub">Zapamti dug</div>
        </button>
      </div>
      <button class="btn btn-secondary" style="margin-top:16px;" onclick="closeSheet()">Otkaži</button>
    </div>`;
  openSheet(html);
}

function completeWithPayment(paymentStatus) {
  const apt = state.appointments.find(a=>a.id===currentAptId);
  if (!apt) return;
  apt.status = "completed";
  apt.paymentStatus = paymentStatus;
  saveState();
  closeSheet();
  setTimeout(()=>openNextAppointmentPrompt(apt), 450);
}

function markAsPaid() {
  const apt = state.appointments.find(a=>a.id===currentAptId);
  if (!apt) return;
  apt.paymentStatus = "paid";
  saveState();
  closeSheet();
  toast("Plaćeno");
  renderToday();
  renderClients();
  if (state.currentTab === "revenue") renderRevenue();
  if (state.profileClientId) renderClientProfile();
}

// ============================================================
// SLEDEĆI TERMIN
// ============================================================
function openNextAppointmentPrompt(completedApt) {
  const client = clientById(completedApt.clientId);
  if (!client) return;

  const completed = state.appointments.filter(a=>a.clientId===client.id && a.status==="completed").sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0, 4);
  let daysToAdd = 21;
  if (completed.length >= 3) {
    const gaps = [];
    for (let i=0; i<completed.length-1 && i<3; i++) {
      const gap = Math.round((new Date(completed[i].date) - new Date(completed[i+1].date)) / 86400000);
      if (gap > 0) gaps.push(gap);
    }
    if (gaps.length > 0) {
      const avg = Math.round(gaps.reduce((s,g)=>s+g,0) / gaps.length);
      const consistent = gaps.every(g => Math.abs(g-avg) <= 4);
      daysToAdd = consistent ? avg : 21;
    }
  }

  const suggested = addDays(new Date(), daysToAdd);
  const lastTime = minutesFromDate(new Date(completed[0].date));
  suggested.setHours(Math.floor(lastTime/60), lastTime%60, 0, 0);

  const dayLabel = daysToAdd <= 7 ? `${daysToAdd} dana` : daysToAdd <= 30 ? `${Math.round(daysToAdd/7)} nedelje` : `${Math.round(daysToAdd/30)} meseca`;

  const html = `<div class="sheet-grabber"></div>
    <div class="sheet-body" style="padding-top:12px;">
      <div class="success-hero">
        <div class="success-title" style="font-size:24px;">Sledeći termin?</div>
        <div class="success-sub">${client.firstName} obično dolazi na ${dayLabel}.</div>
      </div>
      <div class="next-card" style="margin-bottom:20px;">
        <div class="next-card-time">${formatTime(suggested)}</div>
        <div class="next-card-date">${capitalize(DAYS_LONG[suggested.getDay()])}, ${suggested.getDate()}. ${MONTHS[suggested.getMonth()]}</div>
      </div>
      <button class="btn btn-primary" onclick="confirmNextAppointment(${suggested.getTime()}, '${completedApt.id}')">Zakaži</button>
      <button class="btn btn-secondary" style="margin-top:12px;" onclick="openNewAppointmentSheet('${client.id}')">Drugi termin</button>
      <button class="btn btn-secondary" style="margin-top:12px;background:transparent;color:var(--text-2);" onclick="closeSheet()">Ne sada</button>
    </div>`;
  openSheet(html);
}

function confirmNextAppointment(ts, prevId) {
  const prev = state.appointments.find(a=>a.id===prevId);
  if (!prev) return;
  const d = new Date(ts);
  state.appointments.push({
    id: "a" + Date.now(),
    date: d.toISOString(),
    clientId: prev.clientId,
    services: prev.services.map(s=>({ ...s })),
    status: "scheduled",
    paymentStatus: "unpaid"
  });
  saveState();
  closeSheet();
  toast("Sledeći termin zakazan");
  renderToday();
  renderClients();
  if (state.profileClientId) renderClientProfile();
}

// ============================================================
// USLUGE (cenovnik)
// ============================================================
function openServiceEditSheet(serviceId) {
  const svc = state.services.find(s=>s.id===serviceId);
  if (!svc) return;
  const html = `<div class="sheet-grabber"></div>
    <div class="sheet-header"><div class="sheet-title">Izmeni uslugu</div>
      <button class="sheet-close" onclick="closeSheet()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="sheet-body">
      <div class="field"><label class="field-label">Naziv</label><input class="field-input" id="svc-name" type="text" value="${svc.name}"></div>
      <div class="field"><label class="field-label">Cena (RSD)</label><input class="field-input" id="svc-price" type="number" inputmode="numeric" value="${svc.price}"></div>
      <button class="btn btn-primary" onclick="saveServiceEdit('${serviceId}')">Sačuvaj</button>
      <button class="btn btn-danger" style="margin-top:12px;" onclick="archiveService('${serviceId}')">Arhiviraj</button>
    </div>`;
  openSheet(html);
}

function saveServiceEdit(id) {
  const svc = state.services.find(s=>s.id===id);
  if (!svc) return;
  const name = document.getElementById("svc-name").value.trim();
  const price = Number(document.getElementById("svc-price").value);
  if (!name || isNaN(price) || price < 0) { toast("Proveri unos"); return; }
  svc.name = name; svc.price = price;
  saveState();
  closeSheet();
  toast("Usluga izmenjena");
  renderPricelist();
  updateSettingsSub();
}

function archiveService(id) {
  const svc = state.services.find(s=>s.id===id);
  if (!svc) return;
  svc.isArchived = true;
  saveState();
  closeSheet();
  toastUndo("Usluga arhivirana", () => {
    svc.isArchived = false;
    saveState();
    renderPricelist();
    updateSettingsSub();
  });
  renderPricelist();
  updateSettingsSub();
}

function openNewServiceSheet() {
  const html = `<div class="sheet-grabber"></div>
    <div class="sheet-header"><div class="sheet-title">Nova usluga</div>
      <button class="sheet-close" onclick="closeSheet()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="sheet-body">
      <div class="field"><label class="field-label">Naziv</label><input class="field-input" id="svc-new-name" type="text"></div>
      <div class="field"><label class="field-label">Cena (RSD)</label><input class="field-input" id="svc-new-price" type="number" inputmode="numeric" value="2000"></div>
      <button class="btn btn-primary" onclick="saveNewService()">Sačuvaj</button>
    </div>`;
  openSheet(html);
  setTimeout(()=>document.getElementById("svc-new-name")?.focus(), 350);
}

function saveNewService() {
  const name = document.getElementById("svc-new-name").value.trim();
  const price = Number(document.getElementById("svc-new-price").value);
  if (!name || isNaN(price) || price < 0) { toast("Proveri unos"); return; }
  state.services.push({ id:"s"+Date.now(), name, price, sortOrder:state.services.length, isArchived:false });
  saveState();
  closeSheet();
  toast("Usluga dodata");
  renderPricelist();
  updateSettingsSub();
}

// ============================================================
// IZMENA KLIJENTKINJE
// ============================================================
function openEditClientSheet() {
  const client = clientById(state.profileClientId);
  if (!client) return;
  const html = `<div class="sheet-grabber"></div>
    <div class="sheet-header"><div class="sheet-title">Izmeni</div>
      <button class="sheet-close" onclick="closeSheet()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="sheet-body">
      <div class="field-row">
        <div class="field"><label class="field-label">Ime</label><input class="field-input" id="edit-first" type="text" value="${client.firstName}"></div>
        <div class="field"><label class="field-label">Prezime</label><input class="field-input" id="edit-last" type="text" value="${client.lastName}"></div>
      </div>
      <div class="field"><label class="field-label">Telefon</label><input class="field-input" id="edit-phone" type="tel" value="${client.phone||""}"></div>
      <div class="field"><label class="field-label">Napomena</label><input class="field-input" id="edit-note" type="text" value="${client.note||""}"></div>
      <button class="btn btn-primary" onclick="saveClientEdit()">Sačuvaj</button>
      <button class="btn btn-danger" style="margin-top:12px;" onclick="archiveClient()">Arhiviraj</button>
    </div>`;
  openSheet(html);
}

function saveClientEdit() {
  const client = clientById(state.profileClientId);
  if (!client) return;
  const firstName = document.getElementById("edit-first").value.trim();
  const lastName = document.getElementById("edit-last").value.trim();
  if (!firstName || !lastName) { toast("Ime i prezime su obavezni"); return; }
  client.firstName = firstName; client.lastName = lastName;
  client.phone = document.getElementById("edit-phone").value.trim();
  client.note = document.getElementById("edit-note").value.trim();
  saveState();
  closeSheet();
  toast("Sačuvano");
  renderClientProfile();
  renderClients();
}

function archiveClient() {
  const client = clientById(state.profileClientId);
  if (!client) return;
  client.isArchived = true;
  saveState();
  closeSheet();
  toastUndo("Klijentkinja arhivirana", () => {
    client.isArchived = false;
    saveState();
    renderClients();
  });
  state.profileClientId = null;
  showTab("clients");
}

// ============================================================
// RADNO VREME
// ============================================================
function openWorkHoursSheet() {
  const s = state.settings;
  let options = "";
  for (let h=5; h<=14; h++) options += `<option value="${h}" ${s.workStart===h?"selected":""}>${String(h).padStart(2,"0")}:00</option>`;
  let optionsEnd = "";
  for (let h=15; h<=23; h++) optionsEnd += `<option value="${h}" ${s.workEnd===h?"selected":""}>${String(h).padStart(2,"0")}:00</option>`;

  const html = `<div class="sheet-grabber"></div>
    <div class="sheet-header"><div class="sheet-title">Radno vreme</div>
      <button class="sheet-close" onclick="closeSheet()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="sheet-body">
      <div class="field-row">
        <div class="field"><label class="field-label">Od</label><select class="field-input" id="work-start">${options}</select></div>
        <div class="field"><label class="field-label">Do</label><select class="field-input" id="work-end">${optionsEnd}</select></div>
      </div>
      <button class="btn btn-primary" onclick="saveWorkHours()">Sačuvaj</button>
    </div>`;
  openSheet(html);
}

function saveWorkHours() {
  const start = Number(document.getElementById("work-start").value);
  const end = Number(document.getElementById("work-end").value);
  if (end <= start) { toast("Kraj mora biti posle početka"); return; }
  state.settings.workStart = start;
  state.settings.workEnd = end;
  saveState();
  closeSheet();
  toast("Sačuvano");
  updateSettingsSub();
}

// ============================================================
// BACKUP SETTINGS
// ============================================================
function openBackupSheet() {
  const enabled = state.settings.cloudBackupEnabled;
  const hasKey = !!JSONBIN_MASTER_KEY;
  let statusText = "";
  if (!hasKey) statusText = "Cloud backup nije postavljen. Aplikacija čuva podatke lokalno na telefonu.";
  else if (!enabled) statusText = "Cloud backup je isključen. Podaci se čuvaju samo na telefonu.";
  else if (lastBackupTime) statusText = `Poslednji backup: ${formatTime(lastBackupTime)}`;
  else statusText = "Backup je aktivan. Prvi backup u toku.";

  const html = `<div class="sheet-grabber"></div>
    <div class="sheet-header"><div class="sheet-title">Automatski backup</div>
      <button class="sheet-close" onclick="closeSheet()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="sheet-body">
      <p style="color:var(--text-2);font-size:15px;line-height:1.5;margin-bottom:20px;">${statusText}</p>
      ${hasKey ? `
        <button class="btn ${enabled?"btn-danger":"btn-primary"}" onclick="toggleCloudBackup()">${enabled?"Isključi backup":"Uključi backup"}</button>
        ${enabled ? `<button class="btn btn-secondary" style="margin-top:12px;" onclick="forceBackup()">Backup sada</button>` : ""}
        <button class="btn btn-secondary" style="margin-top:12px;" onclick="restoreFromCloudNow()">Vrati iz cloud kopije</button>
      ` : `
        <div class="note-card" style="font-size:14px;">
          <strong>Kako da uključiš:</strong><br><br>
          1. Idi na jsonbin.io<br>
          2. Napravi besplatan nalog<br>
          3. Kopiraj Master Key<br>
          4. Otvori app.js i nalepi ključ u <code>JSONBIN_MASTER_KEY</code>
        </div>
      `}
    </div>`;
  openSheet(html);
}

function toggleCloudBackup() {
  state.settings.cloudBackupEnabled = !state.settings.cloudBackupEnabled;
  saveState();
  closeSheet();
  toast(state.settings.cloudBackupEnabled ? "Backup uključen" : "Backup isključen");
  updateSettingsSub();
}

async function forceBackup() {
  closeSheet();
  toast("Backup u toku...");
  await backupToCloud();
  toast(lastBackupTime ? "Backup završen" : "Backup nije uspeo");
  updateSettingsSub();
}

async function restoreFromCloudNow() {
  if (!confirm("Vratiti podatke iz cloud kopije? Trenutni podaci će biti zamenjeni.")) return;
  try {
    const restored = await restoreFromCloud();
    state = restored;
    saveState();
    closeSheet();
    toast("Podaci vraćeni");
    showTab("today");
  } catch (e) {
    toast("Greška: " + e.message);
  }
}

// ============================================================
// EXPORT / IMPORT / RESET
// ============================================================
function exportData() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nokti-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Kopija sačuvana");
}

function importData() {
  document.getElementById("file-input").click();
}

function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!confirm("Uvesti kopiju? Trenutni podaci će biti zamenjeni.")) return;
      state = reviveState(data);
      saveState();
      toast("Podaci uvezeni");
      showTab("today");
    } catch (err) {
      toast("Neispravan fajl");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

function resetData() {
  if (!confirm("Obrisati sve podatke?")) return;
  state = seedEmptyState();
  saveState();
  showTab("today");
  toast("Podaci obrisani");
}

// ============================================================
// EVENTS
// ============================================================
document.getElementById("btn-prev-day").onclick = () => { state.selectedDate = startOfDay(addDays(state.selectedDate,-1)); saveState(); renderToday(); };
document.getElementById("btn-next-day").onclick = () => { state.selectedDate = startOfDay(addDays(state.selectedDate,1)); saveState(); renderToday(); };
document.getElementById("btn-back-today").onclick = () => { state.selectedDate = startOfDay(new Date()); saveState(); renderToday(); };
document.getElementById("btn-new-appointment").onclick = () => openNewAppointmentSheet(null);

document.querySelectorAll(".tab").forEach(tab => tab.onclick = () => showTab(tab.dataset.tab));

document.getElementById("btn-add-client").onclick = () => openNewClientSheet(false);
document.getElementById("btn-edit-client").onclick = () => openEditClientSheet();
document.getElementById("btn-back-from-profile").onclick = () => showTab("clients");
document.getElementById("client-search").oninput = (e) => { clientSearchQuery = e.target.value; renderClients(); };

document.getElementById("settings-pricelist").onclick = () => { showScreen("pricelist"); renderPricelist(); };
document.getElementById("btn-back-from-pricelist").onclick = () => showTab("settings");
document.getElementById("btn-add-service").onclick = () => openNewServiceSheet();
document.getElementById("settings-work-hours").onclick = openWorkHoursSheet;
document.getElementById("settings-backup").onclick = openBackupSheet;
document.getElementById("settings-export").onclick = exportData;
document.getElementById("settings-import").onclick = importData;
document.getElementById("settings-reset").onclick = resetData;
document.getElementById("file-input").onchange = handleFileImport;

// ============================================================
// SWIPE
// ============================================================
(function setupSwipe() {
  const el = document.getElementById("main-content");
  let startX=0, startY=0, tracking=false;
  el.addEventListener("touchstart", e => {
    if (e.touches.length !== 1) return;
    if (document.getElementById("sheet-overlay").classList.contains("visible")) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });
  el.addEventListener("touchend", e => {
    if (!tracking) return;
    tracking = false;
    if (state.currentTab !== "today") return;
    if (!document.querySelector("#screen-today.active")) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx > 0) state.selectedDate = startOfDay(addDays(state.selectedDate,-1));
    else state.selectedDate = startOfDay(addDays(state.selectedDate,1));
    saveState();
    renderToday();
  }, { passive: true });
})();

// ============================================================
// INIT
// ============================================================
(function init() {
  const loaded = loadState();
  if (loaded) {
    state = loaded;
    state.selectedDate = startOfDay(new Date());
    renderToday();
    updateSettingsSub();
    scheduleBackup();
  } else {
    showWelcomeIfNeeded();
  }
})();

window.addEventListener("online", () => scheduleBackup());
