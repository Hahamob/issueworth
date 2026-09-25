const config = window.ISSUEWORTH_CONFIG || {};
const $ = (selector) => document.querySelector(selector);
const form = $("#analyze-form");
const urlInput = $("#issue-url");
const result = $("#result");
const loading = $("#loading");
const errorBox = $("#error");

const sample = {
  score: 84,
  verdict: "pursue",
  payout: 250,
  source: {
    title: "Add tested CSV export for audit reports",
    url: "https://github.com/example/active-project/issues/42",
    repository: "example/active-project",
    stars: 1240,
    language: "Python",
  },
  components: { paymentConfidence: 92, repositoryHealth: 88, availability: 91, taskClarity: 72 },
  evidence: {
    blockers: [],
    warnings: ["Confirm the expected CSV dialect with the maintainer before implementation."],
    positives: ["A stated amount of $250 was found.", "Recognized payment or automation evidence is present.", "Repository development is recently active.", "No assignee or related open PR was detected.", "Recent sampled PR merge ratio is 70%."],
  },
  metrics: { lastRepoPushDays: 1, assignees: 0, relatedOpenPulls: 0, sampledMergeRatio: 70, issueAgeDays: 5 },
  disclaimer: "Sample report — IssueWorth provides evidence-based decision support, not a payment guarantee.",
};

const verdicts = {
  pursue: { title: "Pursue this opportunity", copy: "Evidence is strong enough to justify a focused maintainer check and claim request.", icon: "↗", color: "var(--mint)" },
  verify: { title: "Verify before you build", copy: "There is potential here, but the unresolved signals could materially change your expected return.", icon: "!", color: "var(--amber)" },
  skip: { title: "Skip this opportunity", copy: "The current evidence suggests your time is better invested elsewhere.", icon: "×", color: "var(--red)" },
};

const componentLabels = {
  paymentConfidence: "Payment confidence",
  repositoryHealth: "Repository health",
  availability: "Real availability",
  taskClarity: "Task clarity",
};

function showOnly(section) {
  [result, loading, errorBox].forEach((item) => { item.hidden = item !== section; });
}

function listInto(selector, items, empty) {
  const list = $(selector);
  const values = items?.length ? items : [empty];
  list.innerHTML = values.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function renderReport(data) {
  const verdict = verdicts[data.verdict] || verdicts.verify;
  $("#result-title").textContent = data.source.title;
  $("#result-link").href = data.source.url;
  $("#score-value").textContent = data.score;
  $("#score-progress").style.strokeDashoffset = String(327 - (327 * data.score / 100));
  $("#score-progress").style.stroke = verdict.color;
  $("#verdict-icon").textContent = verdict.icon;
  $("#verdict-icon").style.background = verdict.color;
  $("#verdict-title").textContent = verdict.title;
  $("#verdict-copy").textContent = verdict.copy;
  $("#payout-value").textContent = data.payout ? `$${Number(data.payout).toLocaleString("en-US")}` : "Not verified";

  $("#component-grid").innerHTML = Object.entries(data.components).map(([key, value]) => `
    <article class="component">
      <header><span>${componentLabels[key] || key}</span><b>${value}</b></header>
      <div class="bar"><div style="width:${value}%"></div></div>
    </article>`).join("");

  listInto("#blocker-list", data.evidence.blockers, "No hard blocker detected.");
  listInto("#warning-list", data.evidence.warnings, "No additional verification flag detected.");
  listInto("#positive-list", data.evidence.positives, "No strong positive evidence detected.");
  $("#blocker-count").textContent = data.evidence.blockers.length;
  $("#warning-count").textContent = data.evidence.warnings.length;
  $("#positive-count").textContent = data.evidence.positives.length;

  const metrics = [
    ["Repository", data.source.repository],
    ["Primary language", data.source.language || "—"],
    ["Stars", Number(data.source.stars || 0).toLocaleString("en-US")],
    ["Last push", `${data.metrics.lastRepoPushDays}d ago`],
    ["Assignees", data.metrics.assignees],
    ["Related PRs", data.metrics.relatedOpenPulls],
    ["Sample merge rate", data.metrics.sampledMergeRatio == null ? "—" : `${data.metrics.sampledMergeRatio}%`],
  ];
  $("#metrics-strip").innerHTML = metrics.map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  $("#disclaimer").textContent = data.disclaimer;
  showOnly(result);
  result.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function analyze(url) {
  showOnly(loading);
  const labels = ["Reading public issue evidence…", "Checking claims and related pull requests…", "Calculating an explainable decision score…"];
  let step = 0;
  const ticker = setInterval(() => { $("#loading-label").textContent = labels[Math.min(++step, labels.length - 1)]; }, 900);
  try {
    if (!config.apiBaseUrl) throw new Error("The live API is not configured yet. Use the sample report or deploy the AWS stack.");
    const response = await fetch(`${config.apiBaseUrl.replace(/\/$/, "")}/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to analyse this issue.");
    renderReport(payload);
  } catch (error) {
    $("#error-message").textContent = error.message;
    showOnly(errorBox);
    errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
  } finally {
    clearInterval(ticker);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!urlInput.checkValidity()) return urlInput.reportValidity();
  analyze(urlInput.value.trim());
});

$("#demo-button").addEventListener("click", () => renderReport(sample));
