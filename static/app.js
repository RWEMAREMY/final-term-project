const tabs = document.querySelector("#tabs");
const tabMenuButton = document.querySelector("#tab-menu-button");
const tabMenuLabel = document.querySelector("#tab-menu-label");
const siteMenuButton = document.querySelector("#site-menu-button");
const siteNav = document.querySelector("#site-nav");
const workspace = document.querySelector(".workspace");
const heroVisual = document.querySelector(".hero-visual");
const title = document.querySelector("#component-title");
const distribution = document.querySelector("#distribution");
const reason = document.querySelector("#reason");
const assumptions = document.querySelector("#assumptions");
const runButton = document.querySelector("#run-button");
const average = document.querySelector("#average");
const minimum = document.querySelector("#minimum");
const maximum = document.querySelector("#maximum");
const insight = document.querySelector("#insight");
const canvas = document.querySelector("#chart");
const ctx = canvas.getContext("2d");

let config = {};
let active = "student-arrivals";

const order = [
  "student-arrivals",
  "cafeteria-queues",
  "wifi-failures",
  "shuttle-waits",
  "parking-occupancy",
  "classroom-occupancy",
  "energy-consumption",
];

const componentVisuals = {
  "student-arrivals": { icon: "students", label: "Student Arrivals", color: "#5fa8d3" },
  "cafeteria-queues": { icon: "cafeteria", label: "Cafeteria Queues", color: "#f4a261" },
  "wifi-failures": { icon: "wifi", label: "WiFi Failures", color: "#7bdff2" },
  "shuttle-waits": { icon: "bus", label: "Shuttle Waiting", color: "#90be6d" },
  "parking-occupancy": { icon: "parking", label: "Parking Occupancy", color: "#9d4edd" },
  "classroom-occupancy": { icon: "classroom", label: "Classroom Occupancy", color: "#ffd166" },
  "energy-consumption": { icon: "energy", label: "Energy Consumption", color: "#06d6a0" },
};

function createScenarioSvg(visual) {
  const drawings = {
    students: `<circle cx="190" cy="140" r="34"/><circle cx="270" cy="140" r="34"/><circle cx="350" cy="140" r="34"/><path d="M130 300c16-64 104-64 120 0"/><path d="M210 300c16-64 104-64 120 0"/><path d="M290 300c16-64 104-64 120 0"/><path d="M110 345h340"/>`,
    cafeteria: `<path d="M150 145h260l-22 152H172z"/><path d="M188 105h184"/><path d="M220 104v-42"/><path d="M300 104v-42"/><path d="M166 345h248"/><circle cx="210" cy="220" r="18"/><circle cx="280" cy="220" r="18"/><circle cx="350" cy="220" r="18"/>`,
    wifi: `<path d="M130 190c84-74 216-74 300 0"/><path d="M178 240c58-48 146-48 204 0"/><path d="M226 292c32-24 76-24 108 0"/><circle cx="280" cy="342" r="22"/><path d="M120 116h320"/>`,
    bus: `<rect x="118" y="130" width="324" height="160" rx="28"/><path d="M150 170h260"/><path d="M170 130v160"/><path d="M390 130v160"/><circle cx="190" cy="318" r="28"/><circle cx="370" cy="318" r="28"/>`,
    parking: `<rect x="154" y="92" width="252" height="282" rx="24"/><path d="M224 318V150h82c66 0 66 98 0 98h-82"/><path d="M224 248h82"/><path d="M116 374h328"/>`,
    classroom: `<rect x="118" y="110" width="324" height="188" rx="18"/><path d="M155 160h250"/><path d="M155 210h170"/><path d="M170 342h220"/><path d="M220 298l-24 44"/><path d="M340 298l24 44"/>`,
    energy: `<path d="M298 72l-116 164h86l-42 150 126-184h-88z"/><circle cx="280" cy="230" r="162"/><path d="M122 382h316"/>`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 440"><rect width="560" height="440" rx="34" fill="none"/><g fill="none" stroke="${visual.color}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity="0.92">${drawings[visual.icon]}</g><text x="280" y="418" text-anchor="middle" fill="${visual.color}" font-family="Arial, sans-serif" font-size="34" font-weight="800">${visual.label}</text></svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function applyVisual(target, component) {
  const visual = componentVisuals[component];

  if (!visual || !target) return;

  target.style.setProperty("--scenario-image", createScenarioSvg(visual));
  target.style.setProperty("--scenario-color", visual.color);
  target.dataset.visual = component;
}

function updateScenarioVisual(component) {
  applyVisual(workspace, component);
}

function startHeroShuffle() {
  let index = 0;

  applyVisual(heroVisual, order[index]);

  window.setInterval(() => {
    index = (index + 1) % order.length;
    applyVisual(heroVisual, order[index]);
  }, 4200);
}

function formatValue(value, unit) {
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;
}

function closeSimulationMenu() {
  tabs.classList.remove("is-open");
  tabMenuButton.setAttribute("aria-expanded", "false");
}

function closeSiteMenu() {
  siteNav.classList.remove("is-open");
  siteMenuButton.setAttribute("aria-expanded", "false");
}

function setActive(component) {
  active = component;
  tabMenuLabel.textContent = config[component]?.title || "Simulation menu";
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.component === component);
  });
  updateScenarioVisual(component);
  if (window.matchMedia("(max-width: 560px)").matches) {
    closeSimulationMenu();
  }
  renderForm();
  runSimulation();
}

function renderTabs() {
  tabs.innerHTML = "";
  order.forEach((key, index) => {
    const button = document.createElement("button");
    button.className = "tab";
    button.type = "button";
    button.dataset.component = key;
    button.textContent = `${index + 1}. ${config[key].title}`;
    button.addEventListener("click", () => setActive(key));
    tabs.appendChild(button);
  });
}

function renderForm() {
  const item = config[active];
  title.textContent = item.title;
  distribution.textContent = item.distribution;
  reason.textContent = item.reason;
  assumptions.innerHTML = "";

  Object.entries(item.fields).forEach(([key, field]) => {
    const label = document.createElement("label");
    label.innerHTML = `
      <span>${field.label}</span>
      <input name="${key}" type="number" min="${field.min}" max="${field.max}" step="any" value="${field.default}">
    `;
    assumptions.appendChild(label);
  });
}

async function runSimulation() {
  const params = new URLSearchParams(new FormData(assumptions));
  const response = await fetch(`/api/simulate/${active}?${params.toString()}`);
  const data = await response.json();
  updateMetrics(data);
  drawChart(data);
}

function updateMetrics(data) {
  const unit = data.summary.unit;
  average.textContent = formatValue(data.summary.average, unit);
  minimum.textContent = formatValue(data.summary.minimum, unit);
  maximum.textContent = formatValue(data.summary.maximum, unit);
  insight.innerHTML = data.insight;
}

function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height);
  context.lineTo(x, y + height);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function resizeCanvasToPanel() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(320, Math.round(rect.width * ratio));
  const height = Math.max(240, Math.round(rect.height * ratio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function drawChart(data) {
  resizeCanvasToPanel();
  const width = canvas.width;
  const height = canvas.height;
  const padding = 64;
  const chart = data.chart;
  const values = chart.map((point) => Number(point.value));
  const maxValue = Math.max(...values, 1);
  const plotHeight = height - padding * 2;
  const plotWidth = width - padding * 2;
  const barGap = chart.length > 45 ? 4 : 8;
  const barWidth = Math.max(5, plotWidth / chart.length - barGap);
  const graphColors = ["#4E79A7", "#F28E2B", "#59A14F", "#E15759", "#76B7B2", "#B07AA1"];

  ctx.clearRect(0, 0, width, height);

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#fffaf5");
  background.addColorStop(0.55, "#ffffff");
  background.addColorStop(1, "#fff0eb");
  ctx.fillStyle = background;
  roundedRect(ctx, 10, 10, width - 20, height - 20, 24);
  ctx.fill();

  ctx.strokeStyle = "rgba(62, 41, 34, 0.16)";
  ctx.lineWidth = 1;
  roundedRect(ctx, 10, 10, width - 20, height - 20, 24);
  ctx.stroke();

  ctx.strokeStyle = "rgba(62, 41, 34, 0.12)";
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 8]);
  for (let i = 0; i <= 4; i += 1) {
    const y = padding + (plotHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  chart.forEach((point, index) => {
    const value = Number(point.value);
    const x = padding + index * (barWidth + barGap);
    const barHeight = Math.max(3, (value / maxValue) * plotHeight);
    const y = height - padding - barHeight;
    const color = graphColors[index % graphColors.length];

    ctx.save();
    ctx.shadowColor = "rgba(0, 22, 33, 0.18)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;

    const barGradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
    barGradient.addColorStop(0, color);
    barGradient.addColorStop(1, color === "#FFFFFF" ? "#fff4ec" : color);
    ctx.fillStyle = barGradient;
    roundedRect(ctx, x, y, barWidth, barHeight, 8);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = color === "#FFFFFF" ? "#3E2922" : "rgba(0, 22, 33, 0.72)";
    ctx.lineWidth = color === "#FFFFFF" ? 1.8 : 1;
    roundedRect(ctx, x, y, barWidth, barHeight, 8);
    ctx.stroke();
  });

  ctx.fillStyle = "#001621";
  ctx.font = "800 20px system-ui, sans-serif";
  ctx.fillText(data.title, padding, 38);

  ctx.fillStyle = "#3E2922";
  ctx.font = "700 13px system-ui, sans-serif";
  ctx.fillText(data.xLabel, padding, height - 22);
  ctx.save();
  ctx.translate(24, height / 2 + 42);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(data.summary.unit, 0, 0);
  ctx.restore();

  ctx.fillStyle = "rgba(62, 41, 34, 0.78)";
  ctx.font = "700 12px system-ui, sans-serif";
  ctx.fillText("0", padding - 28, height - padding + 4);
  ctx.fillText(`${Math.ceil(maxValue)}`, padding - 48, padding + 4);
}

async function boot() {
  startHeroShuffle();
  const response = await fetch("/api/config");
  const data = await response.json();
  config = data.components;
  renderTabs();
  setActive(active);
}

tabMenuButton.addEventListener("click", () => {
  const isOpen = tabs.classList.toggle("is-open");
  tabMenuButton.setAttribute("aria-expanded", String(isOpen));
});

siteMenuButton.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("is-open");
  siteMenuButton.setAttribute("aria-expanded", String(isOpen));
});

siteNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeSiteMenu();
});

runButton.addEventListener("click", runSimulation);
assumptions.addEventListener("input", () => {
  window.clearTimeout(assumptions.timer);
  assumptions.timer = window.setTimeout(runSimulation, 350);
});

window.addEventListener("resize", () => {
  if (!window.matchMedia("(max-width: 560px)").matches) {
    closeSimulationMenu();
    closeSiteMenu();
  }
  if (config[active]) {
    runSimulation();
  }
});

boot();
