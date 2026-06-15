const tabs = document.querySelector("#tabs");
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

function formatValue(value, unit) {
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;
}

function setActive(component) {
  active = component;
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.component === component);
  });
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

function drawChart(data) {
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
  const response = await fetch("/api/config");
  const data = await response.json();
  config = data.components;
  renderTabs();
  setActive(active);
}

runButton.addEventListener("click", runSimulation);
assumptions.addEventListener("input", () => {
  window.clearTimeout(assumptions.timer);
  assumptions.timer = window.setTimeout(runSimulation, 350);
});

boot();
