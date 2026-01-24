const ModulePanel_Ffmpeg = {
  apiBase: "/api/modules/ffmpeg",
  refreshIntervalMs: 2000,
  autoRefresh: true,
  _refreshTimer: null,
  _isLoading: false,

  async init() {
    const autoRefreshEl = document.getElementById("ffmpeg-auto-refresh");
    if (autoRefreshEl) {
      this.autoRefresh = !!autoRefreshEl.checked;
    }

    await this.refresh();

    if (this.autoRefresh) {
      this._startAutoRefresh();
    }
  },

  toggleAutoRefresh(enabled) {
    this.autoRefresh = !!enabled;
    if (this.autoRefresh) this._startAutoRefresh();
    else this._stopAutoRefresh();
  },

  _startAutoRefresh() {
    this._stopAutoRefresh();
    this._refreshTimer = setInterval(() => void this.refresh(), this.refreshIntervalMs);
  },

  _stopAutoRefresh() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  },

  async refresh() {
    if (this._isLoading) return;
    this._isLoading = true;
    try {
      const overview = await this._fetchJson(`${this.apiBase}/overview`);
      if (overview?.error) {
        this._renderError(overview.message || overview.error);
        return;
      }
      this._renderTasks(overview.tasks || []);
    } catch (err) {
      this._renderError(err.message);
    } finally {
      this._isLoading = false;
    }
  },

  async submitTask() {
    try {
      const argvRaw = (document.getElementById("ffmpeg-argv")?.value || "").trim();
      const inputsRaw = (document.getElementById("ffmpeg-inputs")?.value || "").trim();
      const outputsRaw = (document.getElementById("ffmpeg-outputs")?.value || "").trim();
      const replacementsRaw = (document.getElementById("ffmpeg-replacements")?.value || "").trim();

      const argv = this._parseArgv(argvRaw);
      const inputs = this._parseJsonArray(inputsRaw);
      const outputs = this._parseJsonArray(outputsRaw);
      const replacements = this._parseJsonArray(replacementsRaw);

      const body = { argv, inputs, outputs, replacements };

      const res = await this._fetchJson(`${this.apiBase}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (res?.error) {
        alert(`提交失败: ${res.message || res.error}`);
        return;
      }

      await this.refresh();
      if (res.taskId) {
        alert(`任务已创建: ${res.taskId}\n输出工件: ${(res.outputArtifactIds || []).join(", ")}`);
      }
    } catch (err) {
      alert(`提交失败: ${err.message}`);
    }
  },

  _parseArgv(text) {
    if (!text) return [];
    if (text.startsWith("[")) {
      const arr = JSON.parse(text);
      if (!Array.isArray(arr) || arr.some(v => typeof v !== "string")) {
        throw new Error("argv JSON 必须是字符串数组");
      }
      return arr;
    }
    return text
      .split(/\s+/)
      .map(s => s.trim())
      .filter(Boolean);
  },

  _parseJsonArray(text) {
    if (!text) return [];
    const data = JSON.parse(text);
    if (!Array.isArray(data)) {
      throw new Error("必须是 JSON 数组");
    }
    return data;
  },

  async _fetchJson(url, options = {}) {
    const resp = await fetch(url, options);
    const text = await resp.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`响应不是 JSON: ${text.slice(0, 200)}`);
    }
  },

  _renderError(message) {
    const container = document.getElementById("ffmpeg-tasks");
    if (!container) return;
    container.innerHTML = `<div class="error">${this.escapeHtml(String(message || "未知错误"))}</div>`;
  },

  _renderTasks(tasks) {
    const container = document.getElementById("ffmpeg-tasks");
    if (!container) return;

    if (!tasks || tasks.length === 0) {
      container.innerHTML = `<div class="loading">暂无任务</div>`;
      return;
    }

    container.innerHTML = tasks.map(t => this._renderTask(t)).join("");
  },

  _renderTask(task) {
    const status = task.status || "unknown";
    const outputs = Array.isArray(task.outputArtifactIds) ? task.outputArtifactIds : [];
    const outputLinks = outputs
      .map(id => `<a href="/artifacts/${this.escapeHtml(id)}" target="_blank" rel="noreferrer">${this.escapeHtml(id)}</a>`)
      .join("");

    return `
      <div class="task">
        <div class="task-header">
          <div class="task-id">${this.escapeHtml(task.taskId || "")}</div>
          <div class="task-status">${this.escapeHtml(status)}</div>
        </div>
        <div class="task-meta">
          <div>createdAt: ${this.escapeHtml(task.createdAt || "")}</div>
          <div>startedAt: ${this.escapeHtml(task.startedAt || "")}</div>
          <div>completedAt: ${this.escapeHtml(task.completedAt || "")}</div>
          <div>exitCode: ${this.escapeHtml(task.exitCode ?? "")}</div>
          <div>error: ${this.escapeHtml(task.error || "")}</div>
        </div>
        ${outputs.length > 0 ? `<div class="artifact-links">${outputLinks}</div>` : ""}
      </div>
    `;
  },

  escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
};

window.ModulePanel_Ffmpeg = ModulePanel_Ffmpeg;
document.addEventListener("DOMContentLoaded", () => void ModulePanel_Ffmpeg.init());

