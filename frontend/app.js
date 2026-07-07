// 前端应用入口
const API_BASE = "/api";

// ── 状态管理 ─────────────────────────────────────────────
const state = {
  resumeText: "",
  analysis: null,
  matchResult: null,
  loading: false,
};

// ── DOM 引用 ─────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// ── API 调用 ─────────────────────────────────────────────
async function uploadResume(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/upload_resume`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "上传失败");
  }
  return res.json();
}

async function analyzeResume(text) {
  const res = await fetch(`${API_BASE}/analyze_resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "分析失败");
  }
  return res.json();
}

async function matchJob(resumeText, jdText) {
  const res = await fetch(`${API_BASE}/match_job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume_text: resumeText,
      job_description: jdText,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "匹配失败");
  }
  return res.json();
}

// ── UI 更新函数 ─────────────────────────────────────────

function setLoading(isLoading) {
  state.loading = isLoading;
  const btn = $("uploadBtn");
  if (btn) btn.disabled = isLoading;
  const statusEl = $("status");
  if (statusEl) {
    statusEl.textContent = isLoading ? "处理中..." : "";
    statusEl.className = isLoading
      ? "mt-2 text-sm text-blue-600"
      : "mt-2 text-sm";
  }
}

function showError(msg) {
  const statusEl = $("status");
  if (statusEl) {
    statusEl.textContent = `❌ ${msg}`;
    statusEl.className = "mt-2 text-sm text-red-600";
  }
}

function renderSkills(skills) {
  if (!skills || skills.length === 0) return "<p>暂未识别到技能</p>";
  return skills
    .map((s) => `<span class="skill-tag">${s}</span>`)
    .join("");
}

function renderExperience(experience) {
  if (!experience || experience.length === 0) return "<p>暂未识别到工作经历</p>";
  return experience
    .map(
      (exp) => `
    <div class="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div class="font-semibold text-gray-800">${exp.company || "未知公司"}</div>
      <div class="text-sm text-gray-600">${exp.position || ""} · ${exp.duration || ""}</div>
      ${exp.description?.length ? `<ul class="mt-1 list-disc list-inside text-sm text-gray-700">${exp.description.map((d) => `<li>${d}</li>`).join("")}</ul>` : ""}
    </div>
  `
    )
    .join("");
}

function renderMatchResult(result) {
  const score = result.match_score;
  const color =
    score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600";

  return `
    <div class="space-y-4">
      <div class="text-center">
        <div class="text-5xl font-bold ${color}">${score}</div>
        <div class="text-sm text-gray-500 mt-1">匹配度</div>
      </div>

      <div>
        <h4 class="font-semibold text-gray-700 mb-2">✅ 匹配技能</h4>
        <div class="flex flex-wrap gap-1.5">
          ${result.matched_skills.map((s) => `<span class="skill-tag skill-match">${s}</span>`).join("")}
        </div>
      </div>

      <div>
        <h4 class="font-semibold text-gray-700 mb-2">⚠️ 缺失技能</h4>
        <div class="flex flex-wrap gap-1.5">
          ${result.missing_skills.map((s) => `<span class="skill-tag skill-miss">${s}</span>`).join("")}
        </div>
      </div>

      <div>
        <h4 class="font-semibold text-gray-700 mb-2">💡 优化建议</h4>
        <ul class="list-disc list-inside text-sm text-gray-700 space-y-1">
          ${result.suggestions.map((s) => `<li>${s}</li>`).join("")}
        </ul>
      </div>

      <div>
        <h4 class="font-semibold text-gray-700 mb-2">📋 综合分析</h4>
        <p class="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">${result.analysis}</p>
      </div>
    </div>
  `;
}

// ── 页面渲染 ─────────────────────────────────────────────

function render() {
  $("app").innerHTML = `
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-5xl mx-auto px-4 py-6">
        <h1 class="text-2xl font-bold text-gray-900">🤖 Multi-Agent Job Copilot</h1>
        <p class="text-sm text-gray-500 mt-1">智能求职助手 — 上传简历，分析匹配，优化面试</p>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-8">
      <!-- Step 1: 上传简历 -->
      <section class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">📄 第一步：上传简历 (PDF)</h2>
        <div class="flex items-center gap-4">
          <input type="file" id="fileInput" accept=".pdf" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          <button id="uploadBtn" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap">上传解析</button>
        </div>
        <div id="status" class="mt-2 text-sm text-gray-500"></div>
      </section>

      <!-- Step 2: 简历分析结果 -->
      <section id="analysisSection" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 ${state.analysis ? "" : "hidden"}">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">📊 第二步：简历分析</h2>
        <div id="analysisContent"></div>
      </section>

      <!-- Step 3: JD 匹配 -->
      <section id="matchSection" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${state.analysis ? "" : "hidden"}">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">🎯 第三步：岗位匹配</h2>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">粘贴岗位描述 (JD)</label>
          <textarea id="jdInput" rows="6" class="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="请将岗位描述粘贴到这里..."></textarea>
        </div>
        <button id="matchBtn" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">开始匹配</button>
        <div id="matchStatus" class="mt-2 text-sm text-gray-500"></div>
        <div id="matchContent" class="mt-4"></div>
      </section>
    </main>
  `;

  // ── 绑定事件 ─────────────────────────────────────────
  $("uploadBtn").addEventListener("click", handleUpload);
  $("matchBtn").addEventListener("click", handleMatch);
}

// ── 事件处理 ─────────────────────────────────────────────

async function handleUpload() {
  const file = $("fileInput").files[0];
  if (!file) {
    showError("请先选择 PDF 文件");
    return;
  }

  setLoading(true);

  try {
    // Step 1: 上传并解析
    const uploadResult = await uploadResume(file);
    state.resumeText = uploadResult.text;
    $("status").textContent = `✅ 解析完成：${uploadResult.filename}（${uploadResult.text.length} 字符）`;
    $("status").className = "mt-2 text-sm text-green-600";

    // Step 2: 分析简历
    const analysis = await analyzeResume(state.resumeText);
    state.analysis = analysis;

    // 渲染分析结果
    $("analysisSection").classList.remove("hidden");
    $("analysisContent").innerHTML = `
      <div class="space-y-4">
        <div>
          <h4 class="font-semibold text-gray-700 mb-2">🛠 技能</h4>
          <div class="flex flex-wrap gap-1.5">${renderSkills(analysis.skills)}</div>
        </div>
        ${analysis.education?.school ? `
        <div>
          <h4 class="font-semibold text-gray-700 mb-2">🎓 教育背景</h4>
          <div class="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
            <div class="font-medium">${analysis.education.school}</div>
            <div class="text-gray-600">${analysis.education.degree} · ${analysis.education.major} · ${analysis.education.duration}</div>
          </div>
        </div>` : ""}
        <div>
          <h4 class="font-semibold text-gray-700 mb-2">💼 工作经历</h4>
          ${renderExperience(analysis.experience)}
        </div>
        ${analysis.summary ? `
        <div>
          <h4 class="font-semibold text-gray-700 mb-2">📝 简介</h4>
          <p class="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">${analysis.summary}</p>
        </div>` : ""}
      </div>
    `;

    // 显示匹配区域
    $("matchSection").classList.remove("hidden");
    $("matchSection").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

async function handleMatch() {
  const jd = $("jdInput").value;
  if (!jd.trim()) {
    $("matchStatus").textContent = "❌ 请输入岗位描述";
    $("matchStatus").className = "mt-2 text-sm text-red-600";
    return;
  }

  $("matchBtn").disabled = true;
  $("matchStatus").textContent = "分析中...";
  $("matchStatus").className = "mt-2 text-sm text-blue-600";

  try {
    const result = await matchJob(state.resumeText, jd);
    state.matchResult = result;

    $("matchContent").innerHTML = renderMatchResult(result);
    $("matchStatus").textContent = "✅ 匹配完成";
    $("matchStatus").className = "mt-2 text-sm text-green-600";
  } catch (err) {
    $("matchStatus").textContent = `❌ ${err.message}`;
    $("matchStatus").className = "mt-2 text-sm text-red-600";
  } finally {
    $("matchBtn").disabled = false;
  }
}

// ── 启动应用 ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", render);
