import { ui } from "./ui.js";
import { state, getSelectedReqId, getCurrentProject, getCurrentUser, setCurrentProject } from "./state.js";
import { getRequirement, getRequirementsByProject } from "./requirements.js";
import { escapeHtml, formatTime } from "./utils.js";
import { t } from "./i18n.js";

export function renderTree() {
  renderTreeFor(
    ui.reqTree,
    ui.searchReq?.value || "",
    ui.filterDiscipline?.value || "",
    ui.filterStatus?.value || "",
    ui.filterInfo?.value || "",
    true
  );
  scrollSelectedIntoView(ui.reqTree);
  if (ui.newReqTree) {
    renderTreeFor(
      ui.newReqTree,
      ui.newSearchReq?.value || "",
      ui.newFilterDiscipline?.value || "",
      ui.newFilterStatus?.value || "",
      ui.newFilterInfo?.value || "",
      false
    );
  }
}

function renderTreeFor(target, queryValue, disciplineFilter, statusFilter, infoFilter, highlightSelected) {
  if (!target) return;
  const projectId = state.currentProjectId;
  const source = projectId ? getRequirementsByProject(projectId) : [];
  const query = queryValue.trim().toLowerCase();
  const filtered = source
    .filter((req) => {
      if (!query) return true;
      return req.id.toLowerCase().includes(query) || req.requirement.toLowerCase().includes(query);
    })
    .filter((req) => {
      if (disciplineFilter && req.discipline !== disciplineFilter) return false;
      if (statusFilter && req.status !== statusFilter) return false;
      if (infoFilter === "info" && !req.isInfo) return false;
      if (infoFilter === "non-info" && req.isInfo) return false;
      return true;
    });
  const byParent = filtered.reduce((acc, req) => {
    const key = req.parentId || "root";
    acc[key] = acc[key] || [];
    acc[key].push(req);
    return acc;
  }, {});
  target.innerHTML = "";
  renderBranch(byParent, "root", 0, target, highlightSelected);
}

function formatStatus(value) {
  const map = {
    Draft: t("status.draft"),
    "In Review": t("status.inReview"),
    Approved: t("status.approved"),
    Rejected: t("status.rejected"),
  };
  return map[value] || value;
}

function statusClass(value) {
  switch (value) {
    case "Approved":
      return "status-approved";
    case "Draft":
      return "status-draft";
    case "Rejected":
      return "status-rejected";
    case "In Review":
      return "status-review";
    default:
      return "";
  }
}

function formatDiscipline(value) {
  if (value === "-") return "-";
  const map = {
    System: t("discipline.system"),
    Mechanical: t("discipline.mechanical"),
    Software: t("discipline.software"),
    Electronics: t("discipline.electronics"),
    Automation: t("discipline.automation"),
    Optics: t("discipline.optics"),
    Other: t("discipline.other"),
  };
  return map[value] || value;
}

function formatRequirementType(value) {
  if (
    value === "A??klama" ||
    value === "Aciklama" ||
    value === "A????klama" ||
    value === "A??klama" ||
    value === "A????klama"
  )
    return t("reqType.info");
  const map = {
    Functional: t("reqType.functional"),
    Performance: t("reqType.performance"),
    Safety: t("reqType.safety"),
    Security: t("reqType.security"),
    Regulatory: t("reqType.regulatory"),
    Interface: t("reqType.interface"),
    Constraint: t("reqType.constraint"),
    Technical: t("reqType.technical"),
    Environmental: t("reqType.environmental"),
  };
  return map[value] || value;
}

function formatVerificationLabel(values) {
  if (!values) return "";
  const list = Array.isArray(values)
    ? values
    : String(values)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  if (!list.length) return "";
  const map = {
    Analysis: t("verification.analysis"),
    Test: t("verification.test"),
    Inspection: t("verification.inspection"),
    Demonstration: t("verification.demonstration"),
    "Certificate of Conformity": t("verification.coc"),
    "-": t("meta.dash"),
  };
  return list.map((value) => map[value] || value).join(", ");
}

function formatRole(value) {
  const map = {
    user: t("role.user"),
    supervisor: t("role.supervisor"),
    admin: t("role.admin"),
    editor: t("role.editor"),
    viewer: t("role.viewer"),
  };
  return map[value] || value;
}

function formatSubsystemLines(list) {
  if (!Array.isArray(list)) return "";
  return list
    .map((item) => `${item.code || ""} - ${item.label || ""}`.trim())
    .filter((line) => line.trim() && line.trim() !== "-")
    .join("\n");
}

function renderBranch(byParent, parentId, depth, target, highlightSelected) {
  const items = byParent[parentId] || [];
  items.forEach((req) => {
    const card = document.createElement("div");
    card.className = "req-card";
    if (highlightSelected && req.id === getSelectedReqId()) {
      card.classList.add("selected");
    }
    card.dataset.id = req.id;
    card.style.marginLeft = `${depth * 12}px`;
    card.innerHTML = `
      <div class="req-head">
        <div class="req-title"><span class="req-id">${req.id}</span> - ${escapeHtml(req.requirement)}</div>
        <span class="tag status ${statusClass(req.status)}">${escapeHtml(formatStatus(req.status))}</span>
      </div>
      <div class="req-meta">
        ${req.globalId ? `<span class="tag global">${escapeHtml(req.globalId)}</span>` : ""}
        ${req.subsystemCode ? `<span class="tag subsystem">${escapeHtml(req.subsystemCode)}</span>` : ""}
        <span class="tag">${escapeHtml(formatDiscipline(req.isInfo ? "-" : req.discipline))}</span>
        ${
          req.requirementType || req.isInfo
            ? `<span class="tag">${escapeHtml(formatRequirementType(req.isInfo ? "Açıklama" : req.requirementType))}</span>`
            : ""
        }
        ${
          req.verificationMethod || req.isInfo
            ? `<span class="tag">${escapeHtml(formatVerificationLabel(req.isInfo ? ["-"] : req.verificationMethod))}</span>`
            : ""
        }
        ${req.isInfo ? `<span class="tag info">${escapeHtml(t("status.infoTag"))}</span>` : ""}
        ${req.suspect ? `<span class="tag suspect">${escapeHtml(t("status.suspectTag"))}</span>` : ""}
        <span>${escapeHtml(req.targetQuarter)} - ${req.effort} ${escapeHtml(t("meta.pointsShort"))}</span>
      </div>
    `;
    target.appendChild(card);
    renderBranch(byParent, req.id, depth + 1, target, highlightSelected);
  });
}

function scrollSelectedIntoView(target) {
  if (!target) return;
  const selected = target.querySelector(".req-card.selected");
  if (!selected) return;
  selected.scrollIntoView({ block: "nearest", inline: "nearest" });
}

export function renderDetail() {
  const requirement = getRequirement(getSelectedReqId(), state.currentProjectId);
  if (!requirement || requirement.projectId !== state.currentProjectId) {
    ui.detailStatus.textContent = t("status.selectRequirement");
    ui.detailForm.reset();
    ui.commentList.textContent = t("comments.none");
    ui.versionList.textContent = t("versions.none");
    ui.suspectBadge.classList.add("hidden");
    ui.detailParentSelect.textContent = ui.detailParentSelect.dataset.placeholder || t("select.none");
    ui.detailForm.dataset.dirty = "false";
    setDetailNavState(null);
    return;
  }
  ui.detailStatus.textContent = `${requirement.id} ${t("status.loaded")}`;
  ui.detailId.value = requirement.id;
  if (ui.detailGlobalId) ui.detailGlobalId.value = requirement.globalId || "";
  ui.detailTitle.value = requirement.requirement;
  ui.detailDesc.value = requirement.rationale;
  ui.detailDiscipline.value = requirement.discipline;
  if (ui.detailSubsystem) ui.detailSubsystem.value = requirement.subsystemCode || "GEN";
  ui.detailStatusSelect.value = requirement.status;
  ui.detailParent.value = requirement.parentId;
  ui.detailParentSelect.textContent = requirement.parentId
    ? `${requirement.parentId} - ${escapeHtml(
        getRequirement(requirement.parentId, state.currentProjectId)?.requirement || ""
      )}`
    : ui.detailParentSelect.dataset.placeholder || t("select.none");
  ui.detailInfo.checked = requirement.isInfo;
  ui.detailRequirementType.value = requirement.requirementType || "Functional";
  setMultiValues(
    ui.detailVerificationOptions,
    normalizeVerificationList(requirement.verificationMethod || ["Analysis"])
  );
  ui.detailQuarter.value = requirement.targetQuarter;
  ui.detailEffort.value = requirement.effort;
  ui.detailClause.value = requirement.specClause || "";
  ui.detailStandards.value = requirement.references?.standards?.join(", ") || "";
  ui.detailDocs.value = requirement.references?.documents?.join(", ") || "";
  ui.suspectBadge.classList.toggle("hidden", !requirement.suspect);
  applyInfoViewState(requirement.isInfo);
  ui.detailForm.dataset.dirty = "false";
  setDetailNavState(requirement.id);

  ui.commentList.innerHTML = requirement.comments.length
    ? requirement.comments
        .map(
          (comment) =>
            `<div><strong>${comment.author}</strong> - ${formatTime(comment.timestamp)}<br />${escapeHtml(comment.text)}</div>`
        )
        .join("")
    : t("comments.none");

  ui.versionList.innerHTML = requirement.versions.length
    ? requirement.versions
        .map((version) => `<div>${formatTime(version.timestamp)} - ${version.author}</div>`)
        .join("")
    : t("versions.none");
}

function applyInfoViewState(isInfo) {
  if (!ui.detailDiscipline || !ui.detailRequirementType || !ui.detailVerificationOptions) return;
  if (isInfo) {
    ui.detailDiscipline.value = "-";
    ui.detailRequirementType.value = "Açıklama";
    setMultiValues(ui.detailVerificationOptions, ["-"]);
  }
  ui.detailDiscipline.disabled = isInfo;
  ui.detailRequirementType.disabled = isInfo;
  setMultiDisabled(ui.detailVerificationOptions, isInfo);
}

function normalizeVerificationList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function setMultiValues(panel, values) {
  if (!panel) return;
  const set = new Set(values);
  panel.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = set.has(input.value);
  });
  const trigger = panel.closest(".multi-select")?.querySelector(".select-trigger");
  const hidden = panel.closest(".multi-select")?.querySelector('input[type="hidden"]');
  if (hidden) hidden.value = Array.from(set).join(", ");
  if (!trigger) return;
  const placeholder = trigger.dataset.placeholder || t("select.choose");
  const labels = Array.from(set)
    .map((value) => panel.querySelector(`input[value="${cssEscape(value)}"]`)?.nextElementSibling?.textContent?.trim())
    .filter(Boolean);
  trigger.textContent = labels.length ? labels.join(", ") : placeholder;
}

function setMultiDisabled(panel, disabled) {
  if (!panel) return;
  panel.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.disabled = disabled;
  });
  const trigger = panel.closest(".multi-select")?.querySelector(".select-trigger");
  if (trigger) trigger.disabled = disabled;
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

function getVisibleRequirementOrder() {
  const projectId = state.currentProjectId;
  const source = projectId ? getRequirementsByProject(projectId) : [];
  const query = (ui.searchReq?.value || "").trim().toLowerCase();
  const disciplineFilter = ui.filterDiscipline?.value || "";
  const statusFilter = ui.filterStatus?.value || "";
  const infoFilter = ui.filterInfo?.value || "";

  const filtered = source
    .filter((req) => {
      if (!query) return true;
      return req.id.toLowerCase().includes(query) || req.requirement.toLowerCase().includes(query);
    })
    .filter((req) => {
      if (disciplineFilter && req.discipline !== disciplineFilter) return false;
      if (statusFilter && req.status !== statusFilter) return false;
      if (infoFilter === "info" && !req.isInfo) return false;
      if (infoFilter === "non-info" && req.isInfo) return false;
      return true;
    });

  const byParent = filtered.reduce((acc, req) => {
    const key = req.parentId || "root";
    acc[key] = acc[key] || [];
    acc[key].push(req);
    return acc;
  }, {});

  const ordered = [];
  const walk = (parentId) => {
    const items = byParent[parentId] || [];
    items.forEach((req) => {
      ordered.push(req);
      walk(req.id);
    });
  };
  walk("root");
  return ordered;
}

function setDetailNavState(currentId) {
  if (!ui.detailPrev || !ui.detailNext) return;
  const order = getVisibleRequirementOrder();
  if (!currentId || !order.length) {
    ui.detailPrev.disabled = true;
    ui.detailNext.disabled = true;
    return;
  }
  const index = order.findIndex((req) => req.id === currentId);
  ui.detailPrev.disabled = index <= 0;
  ui.detailNext.disabled = index === -1 || index >= order.length - 1;
}

export function renderSelectOptions() {
  const projectId = state.currentProjectId;
  const source = projectId ? getRequirementsByProject(projectId) : [];
  const project = projectId ? state.projects.find((item) => item.id === projectId) : null;
  const options = source.map((req) => ({
    value: req.id,
    label: `${req.id} - ${req.requirement}`,
  }));
  const subsystemOptions = (project?.subsystems || []).map((sub) => ({
    value: sub.code,
    label: `${sub.code} - ${sub.label}`,
  }));
  renderCustomSelect(ui.createParentSelect, ui.createParent, options);
  renderCustomSelect(ui.detailParentSelect, ui.detailParent, options);
  if (ui.createSubsystem) {
    ui.createSubsystem.innerHTML = subsystemOptions
      .map((opt) => `<option value="${opt.value}">${escapeHtml(opt.label)}</option>`)
      .join("");
    if (!ui.createSubsystem.value) {
      ui.createSubsystem.value = subsystemOptions[0]?.value || "GEN";
    }
  }
  if (ui.createGlobalId) {
    const next = Number(state.nextId || 1);
    ui.createGlobalId.value = `REQ-${String(next).padStart(7, "0")}`;
  }
  if (ui.detailSubsystem) {
    ui.detailSubsystem.innerHTML = subsystemOptions
      .map((opt) => `<option value="${opt.value}">${escapeHtml(opt.label)}</option>`)
      .join("");
  }
  ui.traceReqSelect.innerHTML = options
    .map((opt) => `<option value="${opt.value}">${escapeHtml(opt.label)}</option>`)
    .join("");
  ui.prioReqSelect.innerHTML = options
    .map((opt) => `<option value="${opt.value}">${escapeHtml(opt.label)}</option>`)
    .join("");
}




function formatOptionLabel(label) {
  const safe = escapeHtml(label || "");
  const parts = safe.split(" - ");
  if (parts.length < 2) return safe;
  const id = parts.shift();
  const rest = parts.join(" - ");
  return `<span class="req-id">${id}</span> - ${rest}`;
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderCustomSelect(trigger, hiddenInput, options) {
  if (!trigger || !hiddenInput) return;
  const wrap = trigger.closest(".select-wrap");
  if (!wrap) return;
  const panel = wrap.querySelector(".select-options");
  if (!panel) return;

  panel.innerHTML = "";
  const placeholder = trigger.dataset.placeholder || "None";
  const selected = hiddenInput.value || "";

  const noneOption = document.createElement("div");
  noneOption.className = `select-option${selected ? "" : " active"}`;
  noneOption.dataset.value = "";
  noneOption.textContent = placeholder;
  panel.appendChild(noneOption);

  options.forEach((opt) => {
    const item = document.createElement("div");
    item.className = `select-option${opt.value == selected ? " active" : ""}`;
    item.dataset.value = opt.value;
    item.innerHTML = formatOptionLabel(opt.label);
    panel.appendChild(item);
  });

  const selectedLabel = options.find((opt) => opt.value == selected)?.label;
  trigger.innerHTML = selectedLabel ? formatOptionLabel(selectedLabel) : placeholder;
}

export function renderMatrix() {
  const projectId = state.currentProjectId;
  const source = projectId ? getRequirementsByProject(projectId) : [];
  ui.matrixBody.innerHTML = source
    .map(
      (req) => `<tr>
        <td><span class="req-id">${req.id}</span></td>
        <td>${req.links.design.join(", ") || "-"}</td>
        <td>${
          req.links.tests.length
            ? `${req.links.tests.join(", ")}${
                req.links.testsSuspect ? ` (${escapeHtml(t("meta.suspectLabel"))})` : ""
              }`
            : "-"
        }</td>
      </tr>`
    )
    .join("");
}

export function renderPrioFields() {
  const model = ui.prioModel.value;
  if (model === "moscow") {
    ui.prioFields.innerHTML = `
      <label>${t("prio.priority")}
        <select id="prioMoscow">
          <option value="Must">${t("prio.moscow.must")}</option>
          <option value="Should">${t("prio.moscow.should")}</option>
          <option value="Could">${t("prio.moscow.could")}</option>
          <option value="Wont">${t("prio.moscow.wont")}</option>
        </select>
      </label>`;
  }
  if (model === "rice") {
    ui.prioFields.innerHTML = `
      <div class="row two">
        <label>${t("prio.rice.reach")} <input id="prioReach" type="number" min="1" value="1" /></label>
        <label>${t("prio.rice.impact")} <input id="prioImpact" type="number" min="1" max="5" value="3" /></label>
      </div>
      <div class="row two">
        <label>${t("prio.rice.confidence")} <input id="prioConfidence" type="number" min="1" max="5" value="3" /></label>
        <label>${t("prio.rice.effort")} <input id="prioEffort" type="number" min="1" value="3" /></label>
      </div>`;
  }
  if (model === "wsjf") {
    ui.prioFields.innerHTML = `
      <div class="row two">
        <label>${t("prio.wsjf.businessValue")} <input id="prioBv" type="number" min="1" value="5" /></label>
        <label>${t("prio.wsjf.timeCriticality")} <input id="prioTc" type="number" min="1" value="5" /></label>
      </div>
      <div class="row two">
        <label>${t("prio.wsjf.riskReduction")} <input id="prioRr" type="number" min="1" value="5" /></label>
        <label>${t("prio.wsjf.jobSize")} <input id="prioJs" type="number" min="1" value="3" /></label>
      </div>`;
  }
}

export function renderScoreboard() {
  const projectId = state.currentProjectId;
  const source = projectId ? getRequirementsByProject(projectId) : [];
  const sorted = [...source].sort((a, b) => b.score - a.score);
  ui.prioBoard.innerHTML = sorted
    .map(
      (req) => `<div class="scorecard">
        <div>
          <strong class="req-id">${req.id}</strong>
          <div class="muted">${escapeHtml(req.requirement)}</div>
        </div>
        <div>${req.score ? req.score.toFixed(2) : "-"}</div>
      </div>`
    )
    .join("");
}

export function renderRoadmap() {
  const projectId = state.currentProjectId;
  const source = projectId ? getRequirementsByProject(projectId) : [];
  const quarters = ["Faz1", "Faz2", "Faz3", "Faz4"];
  ui.roadmapGrid.innerHTML = quarters
    .map((quarter) => {
      const items = source.filter((req) => req.targetQuarter === quarter);
      const rows = items
        .map(
          (req) => `<div class="roadmap-row">
            <div class="req-title"><span class="req-id">${req.id}</span> - ${escapeHtml(req.requirement)}</div>
            <div class="muted">${escapeHtml(formatDiscipline(req.discipline))} - ${req.effort} ${escapeHtml(t("meta.pointsShort"))}</div>
            <div class="roadmap-bar" style="width:${Math.min(req.effort * 10, 100)}%"></div>
          </div>`
        )
        .join("");
      return `<div>
        <h3>${quarter}</h3>
        ${rows || `<div class="muted">${escapeHtml(t("roadmap.none"))}</div>`}
      </div>`;
    })
    .join("");
}

export function renderBaselines() {
  const projectId = state.currentProjectId;
  const source = projectId ? state.baselines.filter((b) => b.projectId === projectId) : [];
  ui.baselineList.innerHTML = source.length
    ? source
        .map(
          (baseline) =>
            `<div class="baseline-item">
              <strong>${escapeHtml(baseline.name)}</strong>
              <div class="muted">${formatTime(baseline.timestamp)} - ${baseline.requirements.length} ${escapeHtml(t("meta.requirements"))}</div>
            </div>`
        )
        .join("")
    : t("baselines.none");
}

export function syncTraceFields() {
  const requirement = getRequirement(ui.traceReqSelect.value, state.currentProjectId);
  ui.traceDesign.value = requirement ? requirement.links.design.join(", ") : "";
  ui.traceTests.value = requirement ? requirement.links.tests.join(", ") : "";
}

export function refreshAll(saveData) {
  renderHeader();
  renderProjectLabels();
  renderAdmin();
  renderSelectOptions();
  syncTraceFields();
  renderTree();
  renderDetail();
  renderMatrix();
  renderPrioFields();
  renderScoreboard();
  renderRoadmap();
  renderBaselines();
  if (saveData) saveData();
}

function renderProjectLabels() {
  const project = getCurrentProject();
  const suffix = project ? `- ${project.name}` : "";
  if (ui.newReqProjectName) ui.newReqProjectName.textContent = suffix;
  if (ui.newLibraryProjectName) ui.newLibraryProjectName.textContent = suffix;
  if (ui.libraryProjectName) ui.libraryProjectName.textContent = suffix;
  if (ui.detailProjectName) ui.detailProjectName.textContent = suffix;
}

export function renderHeader() {
  const user = getCurrentUser();
  const project = getCurrentProject();
  ui.currentUser.textContent = user ? `${user.name} (${formatRole(user.role)})` : t("auth.notSignedIn");
  ui.projectSelect.disabled = !user;
  const visibleProjects = user ? getVisibleProjects(user) : [];
  ui.projectSelect.innerHTML = user
    ? visibleProjects
        .map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`)
        .join("") || `<option value="">${escapeHtml(t("admin.noProjects"))}</option>`
    : `<option value="">${escapeHtml(t("admin.noProjects"))}</option>`;
  if (user && visibleProjects.length) {
    const active = visibleProjects.find((p) => p.id === state.currentProjectId) || visibleProjects[0];
    if (active && active.id !== state.currentProjectId) {
      setCurrentProject(active.id);
    }
    ui.projectSelect.value = String(active.id);
  }
  ui.adminTab.classList.toggle("hidden", !user || (user.role !== "admin" && user.role !== "supervisor"));
}

function getVisibleProjects(user) {
  return user.role === "admin"
    ? state.projects
    : state.projects.filter((project) =>
        state.memberships.some((m) => m.userId === user.id && m.projectId === project.id)
      );
}

export function renderAdmin() {
  if (!ui.adminAssignUser) return;
  const user = getCurrentUser();
  if (!user) return;
  const isAdmin = user.role === "admin";
  const isSupervisor = user.role === "supervisor";
  const visibleProjects = isAdmin ? state.projects : getVisibleProjects(user);
  const canEditProjects = isAdmin || isSupervisor;

  ui.adminUserSection.classList.toggle("hidden", !isAdmin);
  ui.adminProjectSection.classList.toggle("hidden", !isAdmin);

  ui.adminAssignUser.innerHTML = state.users
    .map((user) => `<option value="${user.id}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`)
    .join("");
  ui.adminAssignProject.innerHTML = visibleProjects
    .map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`)
    .join("");

  if (ui.adminProjectList) {
    const canEdit = canEditProjects;
    ui.adminProjectList.classList.toggle("muted", !visibleProjects.length);
    ui.adminProjectList.innerHTML = visibleProjects.length
      ? visibleProjects
          .map(
            (project) => `
        <div class="project-card">
          <div class="row project-head">
            <strong>${escapeHtml(project.name)}</strong>
            ${
              canEdit
                ? `<div class="row">
                    <button class="ghost project-save" data-project="${project.id}">${escapeHtml(
                      t("admin.projectSave")
                    )}</button>
                    <button class="ghost danger project-delete" data-project="${project.id}">${escapeHtml(
                      t("admin.projectDelete")
                    )}</button>
                  </div>`
                : ""
            }
          </div>
          <div class="row two">
            <label>
              ${t("field.name")}
              <input data-field="name" type="text" value="${escapeAttr(project.name)}" ${
                canEdit ? "" : "disabled"
              } />
            </label>
            <label>
              ${t("field.customer")}
              <input data-field="customer" type="text" value="${escapeAttr(project.customer || "")}" ${
                canEdit ? "" : "disabled"
              } />
            </label>
          </div>
          <div class="row two">
            <label>
              ${t("field.startDate")}
              <input data-field="startDate" type="date" value="${escapeAttr(project.startDate || "")}" ${
                canEdit ? "" : "disabled"
              } />
            </label>
            <label>
              ${t("field.dueDate")}
              <input data-field="dueDate" type="date" value="${escapeAttr(project.dueDate || "")}" ${
                canEdit ? "" : "disabled"
              } />
            </label>
          </div>
          <div class="row two">
            <label>
              ${t("field.systemCode")}
              <input data-field="systemCode" type="text" maxlength="3" value="${escapeAttr(project.systemCode || "")}" ${
                canEdit ? "" : "disabled"
              } />
            </label>
            <label class="full">
              ${t("field.subsystems")}
              <textarea data-field="subsystems" rows="4" ${canEdit ? "" : "disabled"}>${escapeHtml(
                formatSubsystemLines(project.subsystems)
              )}</textarea>
            </label>
          </div>
          <label>
            ${t("field.description")}
            <textarea data-field="description" rows="3" ${canEdit ? "" : "disabled"}>${escapeHtml(
              project.description || ""
            )}</textarea>
          </label>
        </div>
      `
          )
          .join("")
      : escapeHtml(t("admin.noProjects"));
  }

  const memberships = isAdmin
    ? state.memberships
    : state.memberships.filter((m) => visibleProjects.some((p) => p.id === m.projectId));
  ui.adminAccessList.innerHTML = memberships.length
    ? memberships
        .map((membership) => {
          const member = state.users.find((u) => u.id === membership.userId);
          const project = state.projects.find((p) => p.id === membership.projectId);
          const removeBtn =
            isAdmin || isSupervisor
              ? `<button class="ghost danger remove-member" data-user="${membership.userId}" data-project="${membership.projectId}">${escapeHtml(
                  t("admin.remove")
                )}</button>`
              : "";
          return `<div class="row">
            <div><strong>${escapeHtml(member?.name || t("meta.unknown"))}</strong> - ${escapeHtml(
              project?.name || t("meta.unknown")
            )} - ${escapeHtml(formatRole(membership.role))}</div>
            ${removeBtn}
          </div>`;
        })
        .join("")
    : escapeHtml(t("admin.noAssignments"));
}

