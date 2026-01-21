import { ui } from "./ui.js";
import {
  state,
  saveData,
  setSelectedReqId,
  resetState,
  importState,
  getSelectedReqId,
  setCurrentUser,
  setCurrentProject,
  getCurrentUser,
  startRemoteSync,
} from "./state.js";
import { getDefaultSubsystems } from "./state.js";
import {
  createRequirement,
  getRequirement,
  markSuspect,
  getRequirementsByProject,
  ensureApprovedId,
} from "./requirements.js";
import { buildPriority, computeScore } from "./priority.js";
import { escapeCsv, splitList, now } from "./utils.js";
import { buildReqIf, parseReqIf } from "./reqif.js";
import { t, setLanguage, getLanguage } from "./i18n.js";
import {
  refreshAll,
  renderBaselines,
  renderDetail,
  renderPrioFields,
  renderTree,
  syncTraceFields,
} from "./render.js";

export function initTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));

  const activateTab = (target) => {
    tabs.forEach((item) => item.classList.toggle("active", item.dataset.tab === target));
    panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === target));
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });

  activateTab(tabs[0]?.dataset.tab || "import");
}

export function initTemplates() {
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.templateKey;
      ui.createTitle.value = key ? t(key) : chip.dataset.template || "";
      ui.createTitle.focus();
    });
  });
}

export function initHandlers() {
  initCustomSelects();
  ui.loginBtn.addEventListener("click", () => {
    const email = ui.loginEmail.value.trim().toLowerCase();
    const password = ui.loginPassword.value;
    const user = state.users.find((u) => u.email.toLowerCase() === email && u.password === password);
    if (!user) {
      ui.loginStatus.textContent = t("status.invalidCredentials");
      return;
    }
    setCurrentUser(user.id);
    const accessibleProjects = user.role === "admin"
      ? state.projects
      : state.projects.filter((project) =>
          state.memberships.some((m) => m.userId === user.id && m.projectId === project.id)
        );
    setCurrentProject(accessibleProjects[0]?.id ?? null);
    ui.authModal.classList.add("hidden");
    ui.loginStatus.textContent = "";
    ui.loginPassword.value = "";
    refreshAll(saveData);
  });

  ui.loginResetBtn.addEventListener("click", () => {
    if (!confirm(t("confirm.reset"))) return;
    resetState();
    refreshAll(saveData);
    ui.loginStatus.textContent = t("status.localReset");
  });

  ui.logoutBtn.addEventListener("click", () => {
    setCurrentUser(null);
    setCurrentProject(null);
    setSelectedReqId(null);
    ui.authModal.classList.remove("hidden");
    refreshAll(saveData);
  });

  ui.projectSelect.addEventListener("change", () => {
    const value = ui.projectSelect.value ? Number(ui.projectSelect.value) : null;
    setCurrentProject(value);
    setSelectedReqId(null);
    refreshAll(saveData);
  });

  ui.importBtn.addEventListener("click", () => {
    if (!state.currentProjectId) {
      ui.importStatus.textContent = t("status.selectProjectFirst");
      return;
    }
    const lines = ui.importText.value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) {
      ui.importStatus.textContent = t("status.nothingToImport");
      return;
    }
    const created = lines.map((line) => {
      const match = line.match(/^(\d+(?:\.\d+)+)\s+(.*)$/);
      const requirement = match ? match[2] : line;
      const specClause = match ? match[1] : "";
      return createRequirement({
        requirement,
        rationale: line,
        projectId: state.currentProjectId,
        discipline: "System",
        status: "Draft",
        parentId: "",
        isInfo: false,
        requirementType: "Functional",
        verificationMethod: "Analysis",
        effort: 5,
        targetQuarter: "Faz1",
        subsystemCode: "GEN",
        specClause,
        standards: [],
        documents: [],
      });
    });
    ui.importStatus.textContent = t("status.importedRequirements", { count: created.length });
    ui.importText.value = "";
    refreshAll(saveData);
  });

  ui.createForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!state.currentProjectId) return;
    const createVerification = getMultiValues(ui.createVerificationOptions);
    const requirement = createRequirement({
      requirement: ui.createTitle.value.trim(),
      rationale: ui.createDesc.value.trim(),
      projectId: state.currentProjectId,
      discipline: ui.createInfo.checked ? "-" : ui.createDiscipline.value,
      status: ui.createStatus.value,
      parentId: ui.createParent.value || "",
      isInfo: ui.createInfo.checked,
      requirementType: ui.createInfo.checked ? "Açıklama" : ui.createRequirementType.value,
      subsystemCode: ui.createSubsystem?.value || "GEN",
      verificationMethod: ui.createInfo.checked
        ? ["-"]
        : createVerification.length
          ? createVerification
          : ["Analysis"],
      effort: Number(ui.createEffort.value || 5),
      targetQuarter: ui.createQuarter.value,
      specClause: ui.createClause.value.trim(),
      standards: splitList(ui.createStandards.value),
      documents: splitList(ui.createDocs.value),
    });
    const newId = ensureApprovedId(requirement);
    if (newId) setSelectedReqId(newId);
    ui.createForm.reset();
    applyInfoFieldState("create");
    refreshAll(saveData);
  });

  ui.searchReq.addEventListener("input", () => renderTree());
  ui.filterDiscipline.addEventListener("change", () => renderTree());
  ui.filterStatus.addEventListener("change", () => renderTree());
  ui.filterInfo.addEventListener("change", () => renderTree());
  if (ui.newSearchReq) {
    ui.newSearchReq.addEventListener("input", () => renderTree());
  }
  if (ui.newFilterDiscipline) {
    ui.newFilterDiscipline.addEventListener("change", () => renderTree());
  }
  if (ui.newFilterStatus) {
    ui.newFilterStatus.addEventListener("change", () => renderTree());
  }
  if (ui.newFilterInfo) {
    ui.newFilterInfo.addEventListener("change", () => renderTree());
  }

  ui.reqTree.addEventListener("click", (event) => {
    const card = event.target.closest(".req-card");
    if (!card) return;
    setSelectedReqId(card.dataset.id);
    renderTree();
    renderDetail();
  });
  if (ui.newReqTree) {
    ui.newReqTree.addEventListener("click", (event) => {
      const card = event.target.closest(".req-card");
      if (!card) return;
      setSelectedReqId(card.dataset.id);
      renderTree();
      renderDetail();
    });
  }

  ui.detailForm.addEventListener("input", () => {
    if (!getSelectedReqId()) return;
    ui.detailForm.dataset.dirty = "true";
  });
  ui.detailForm.addEventListener("change", () => {
    if (!getSelectedReqId()) return;
    ui.detailForm.dataset.dirty = "true";
  });
  if (ui.createVerificationTrigger && ui.createVerificationOptions) {
    initMultiSelect(ui.createVerificationTrigger, ui.createVerificationOptions, ui.createVerificationMethod);
  }
  if (ui.detailVerificationTrigger && ui.detailVerificationOptions) {
    initMultiSelect(ui.detailVerificationTrigger, ui.detailVerificationOptions, ui.detailVerificationMethod);
  }
  ui.createInfo.addEventListener("change", () => {
    applyInfoFieldState("create");
  });
  ui.detailInfo.addEventListener("change", () => {
    applyInfoFieldState("detail");
  });

  ui.detailForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const requirement = getRequirement(getSelectedReqId(), state.currentProjectId);
    if (!requirement) return;
    const before = structuredClone(requirement);
    requirement.requirement = ui.detailTitle.value.trim();
    requirement.rationale = ui.detailDesc.value.trim();
    requirement.discipline = ui.detailDiscipline.value;
    requirement.status = ui.detailStatusSelect.value;
    requirement.parentId = ui.detailParent.value || "";
    requirement.isInfo = ui.detailInfo.checked;
    requirement.requirementType = ui.detailRequirementType.value;
    requirement.subsystemCode = ui.detailSubsystem?.value || "GEN";
    const detailVerification = getMultiValues(ui.detailVerificationOptions);
    requirement.verificationMethod = detailVerification.length ? detailVerification : ["Analysis"];
    if (requirement.isInfo) {
      requirement.discipline = "-";
      requirement.requirementType = "Açıklama";
      requirement.verificationMethod = ["-"];
    }
    requirement.targetQuarter = ui.detailQuarter.value;
    requirement.effort = Number(ui.detailEffort.value || 5);
    requirement.specClause = ui.detailClause.value.trim();
    requirement.references = {
      standards: splitList(ui.detailStandards.value),
      documents: splitList(ui.detailDocs.value),
    };
    requirement.updatedAt = now();
    requirement.versions.unshift({
      timestamp: requirement.updatedAt,
      author: "local-user",
      snapshot: before,
    });
    markSuspect(requirement);
    const newId = ensureApprovedId(requirement);
    if (newId) setSelectedReqId(newId);
    saveData();
    refreshAll();
    ui.detailForm.dataset.dirty = "false";
    setMultiValues(ui.detailVerificationOptions, requirement.verificationMethod || ["Analysis"]);
    if (pendingAutoNav) {
      const direction = pendingAutoNav;
      pendingAutoNav = null;
      navigateDetail(direction, { force: true });
    }
  });

  ui.commentBtn.addEventListener("click", () => {
    const requirement = getRequirement(getSelectedReqId(), state.currentProjectId);
    if (!requirement) return;
    const text = ui.commentInput.value.trim();
    if (!text) return;
    requirement.comments.unshift({
      text,
      author: "local-user",
      timestamp: now(),
    });
    ui.commentInput.value = "";
    saveData();
    renderDetail();
  });

  ui.traceSave.addEventListener("click", () => {
    const requirement = getRequirement(ui.traceReqSelect.value, state.currentProjectId);
    if (!requirement) return;
    requirement.links.design = splitList(ui.traceDesign.value);
    requirement.links.tests = splitList(ui.traceTests.value);
    requirement.links.testsSuspect = false;
    saveData();
    refreshAll();
  });

  ui.traceReqSelect.addEventListener("change", () => syncTraceFields());

  ui.prioModel.addEventListener("change", renderPrioFields);
  ui.prioSave.addEventListener("click", () => {
    const requirement = getRequirement(ui.prioReqSelect.value, state.currentProjectId);
    if (!requirement) return;
    const model = ui.prioModel.value;
    requirement.priority = buildPriority(model);
    requirement.score = computeScore(requirement.priority);
    saveData();
    refreshAll();
  });

  ui.baselineCreate.addEventListener("click", () => {
    if (!state.currentProjectId) return;
    const name =
      ui.baselineName.value.trim() || t("baselines.defaultName", { count: state.baselines.length + 1 });
    const projectRequirements = getRequirementsByProject(state.currentProjectId);
    state.baselines.unshift({
      name,
      timestamp: now(),
      projectId: state.currentProjectId,
      requirements: structuredClone(projectRequirements),
    });
    ui.baselineName.value = "";
    saveData();
    renderBaselines();
  });

  ui.saveExport.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rms-export.json";
    link.click();
    URL.revokeObjectURL(url);
  });
  if (ui.adminImportJson && ui.adminImportFile) {
    ui.adminImportJson.addEventListener("click", () => {
      ui.adminImportFile.click();
    });
    ui.adminImportFile.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (ui.adminImportStatus) ui.adminImportStatus.textContent = "";
      if (!confirm(t("confirm.importOverwrite"))) {
        if (ui.adminImportStatus) ui.adminImportStatus.textContent = t("status.importCancelled");
        return;
      }
      try {
        if (ui.adminImportBackup?.checked) {
          const stamp = new Date().toISOString().replace(/[:.]/g, "-");
          const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `rms-backup-${stamp}.json`;
          link.click();
          URL.revokeObjectURL(url);
        }
        const text = await file.text();
        const parsed = JSON.parse(text);
        importState(parsed);
        refreshAll();
        if (ui.adminImportStatus) ui.adminImportStatus.textContent = t("status.importSuccess");
      } catch {
        if (ui.adminImportStatus) ui.adminImportStatus.textContent = t("status.importFailed");
        alert(t("status.importFailed"));
      }
    });
  }

  ui.exportCsv.addEventListener("click", () => {
    const projectId = state.currentProjectId;
    const source = projectId ? getRequirementsByProject(projectId) : [];
    const rows = [
      [
        t("csv.header.id"),
        t("csv.header.specClause"),
        t("csv.header.title"),
        t("csv.header.discipline"),
        t("csv.header.subsystem"),
        t("csv.header.status"),
        t("csv.header.info"),
        t("csv.header.requirementType"),
        t("csv.header.verificationMethod"),
        t("csv.header.parent"),
        t("csv.header.quarter"),
        t("csv.header.effort"),
      ],
      ...source.map((req) => [
        req.id,
        req.specClause || "",
        req.requirement,
        formatDisciplineCsv(req.isInfo ? "-" : req.discipline),
        req.subsystemCode || "",
        formatStatusCsv(req.status),
        req.isInfo ? t("meta.yes") : t("meta.no"),
        formatRequirementTypeCsv(req.isInfo ? "Açıklama" : req.requirementType || ""),
        formatVerificationCsv(req.isInfo ? ["-"] : req.verificationMethod),
        req.parentId,
        req.targetQuarter,
        req.effort,
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(";")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "requirements.csv";
    link.click();
    URL.revokeObjectURL(url);
  });
  if (ui.newExportCsv) {
    ui.newExportCsv.addEventListener("click", () => {
      ui.exportCsv.click();
    });
  }

  ui.resetData.addEventListener("click", () => {
    if (!confirm(t("confirm.reset"))) return;
    resetState();
    refreshAll(saveData);
  });

  if (ui.detailPrev) {
    ui.detailPrev.addEventListener("click", () => requestDetailNav(-1, { allowAutoSave: false }));
  }
  if (ui.detailNext) {
    ui.detailNext.addEventListener("click", () => requestDetailNav(1, { allowAutoSave: true }));
  }
  if (ui.unsavedSave) {
    ui.unsavedSave.addEventListener("click", () => handleUnsavedDecision("save"));
  }
  if (ui.unsavedDiscard) {
    ui.unsavedDiscard.addEventListener("click", () => handleUnsavedDecision("discard"));
  }
  if (ui.unsavedCancel) {
    ui.unsavedCancel.addEventListener("click", () => handleUnsavedDecision("cancel"));
  }

  ui.adminCreateUser.addEventListener("click", () => {
    const name = ui.adminUserName.value.trim();
    const email = ui.adminUserEmail.value.trim().toLowerCase();
    const password = ui.adminUserPassword.value.trim();
    const role = ui.adminUserRole.value;
    if (!name || !email || !password) return;
    if (state.users.some((u) => u.email.toLowerCase() === email)) return;
    state.users.push({
      id: state.nextUserId++,
      name,
      email,
      password,
      role,
    });
    ui.adminUserName.value = "";
    ui.adminUserEmail.value = "";
    ui.adminUserPassword.value = "";
    saveData();
    refreshAll();
  });

  ui.adminCreateProject.addEventListener("click", () => {
    const name = ui.adminProjectName.value.trim();
    if (!name) return;
    const systemCode = normalizeSystemCode(ui.adminProjectSystemCode?.value || "");
    const subsystems = parseSubsystemList(ui.adminProjectSubsystems?.value || "");
    state.projects.push({
      id: state.nextProjectId++,
      name,
      customer: ui.adminProjectCustomer.value.trim(),
      startDate: ui.adminProjectStart.value,
      dueDate: ui.adminProjectDue.value,
      description: ui.adminProjectDesc.value.trim(),
      systemCode: systemCode || "SYS",
      subsystems: subsystems.length ? subsystems : getDefaultSubsystems(),
    });
    ui.adminProjectName.value = "";
    ui.adminProjectCustomer.value = "";
    ui.adminProjectStart.value = "";
    ui.adminProjectDue.value = "";
    ui.adminProjectDesc.value = "";
    if (ui.adminProjectSystemCode) ui.adminProjectSystemCode.value = "";
    if (ui.adminProjectSubsystems) ui.adminProjectSubsystems.value = "";
    saveData();
    refreshAll();
  });

  ui.adminAssignBtn.addEventListener("click", () => {
    const userId = Number(ui.adminAssignUser.value);
    const projectId = Number(ui.adminAssignProject.value);
    const role = ui.adminAssignRole.value;
    if (!userId || !projectId) return;
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    if (currentUser.role === "supervisor") {
      const supervisorProjects = state.memberships
        .filter((m) => m.userId === currentUser.id)
        .map((m) => m.projectId);
      if (!supervisorProjects.includes(projectId)) return;
    }
    const existing = state.memberships.find((m) => m.userId === userId && m.projectId === projectId);
    if (existing) {
      existing.role = role;
    } else {
      state.memberships.push({ userId, projectId, role });
    }
    saveData();
    refreshAll();
  });

  enforceAuthState();

  ui.reqifImportBtn.addEventListener("click", async () => {
    if (!state.currentProjectId) return;
    const file = ui.reqifFile.files?.[0];
    if (!file) return;
    const text = await file.text();
    const items = parseReqIf(text);
    items.forEach((item) => {
      createRequirement({
        id: item.id,
        requirement: item.requirement,
        rationale: item.rationale,
        projectId: state.currentProjectId,
        discipline: item.discipline,
        status: item.status,
        parentId: item.parentId,
        isInfo: item.isInfo,
        requirementType: item.requirementType,
        verificationMethod: item.verificationMethod,
        effort: item.effort,
        targetQuarter: item.targetQuarter,
        standards: item.standards,
        documents: item.documents,
      });
    });
    ui.reqifFile.value = "";
    ui.importStatus.textContent = t("status.importedReqif", { count: items.length });
    refreshAll(saveData);
  });

  ui.reqifExportBtn.addEventListener("click", () => {
    if (!state.currentProjectId) return;
    const project = state.projects.find((p) => p.id === state.currentProjectId);
    const source = getRequirementsByProject(state.currentProjectId);
    const xml = buildReqIf(project?.name || t("project.defaultName"), source);
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project?.name || "requirements"}.reqif`;
    link.click();
    URL.revokeObjectURL(url);
  });

  
  ui.csvImportBtn.addEventListener("click", async () => {
    if (!state.currentProjectId) return;
    const file = ui.csvFile.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parsePipe(text);
    if (!rows.length) return;
    const created = rows
      .filter((row) => row.some((cell) => cell.trim() !== ""))
      .map((row) => {
        const specClause = row[0]?.trim() || "";
        const description = row[1]?.trim() || "";
        const verification = splitList(row[2] || "");
        return createRequirement({
          requirement: description,
          rationale: description,
          projectId: state.currentProjectId,
          discipline: "System",
          status: "Draft",
          parentId: "",
          isInfo: false,
          requirementType: "Functional",
          verificationMethod: verification.length ? verification : ["Analysis"],
          effort: 5,
        targetQuarter: "Faz1",
          specClause,
          standards: [],
          documents: [],
        });
      });
    ui.csvFile.value = "";
    ui.importStatus.textContent = t("status.importedCsv", { count: created.length });
    refreshAll(saveData);
  });


  ui.csvTemplateBtn.addEventListener("click", () => {
    const header = [
      t("csv.template.specClause"),
      t("csv.template.description"),
      t("csv.template.verificationMethod"),
    ];
    const example = [
      t("csv.template.specClauseExample"),
      t("csv.template.descriptionExample"),
      t("csv.template.verificationExample"),
    ];
    const csv = [header.join("|"), example.map(escapePipe).join("|")].join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "requirements-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  });

  ui.adminAccessList.addEventListener("click", (event) => {
    const btn = event.target.closest(".remove-member");
    if (!btn) return;
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const userId = Number(btn.dataset.user);
    const projectId = Number(btn.dataset.project);
    if (!userId || !projectId) return;
    if (currentUser.role === "supervisor") {
      const supervisorProjects = state.memberships
        .filter((m) => m.userId === currentUser.id)
        .map((m) => m.projectId);
      if (!supervisorProjects.includes(projectId)) return;
    }
    state.memberships = state.memberships.filter((m) => !(m.userId === userId && m.projectId === projectId));
    saveData();
    refreshAll();
  });

  if (ui.adminProjectList) {
    ui.adminProjectList.addEventListener("click", (event) => {
      const saveBtn = event.target.closest(".project-save");
      const deleteBtn = event.target.closest(".project-delete");
      const btn = saveBtn || deleteBtn;
      if (!btn) return;
      const projectId = Number(btn.dataset.project);
      if (!projectId) return;
      const project = state.projects.find((item) => item.id === projectId);
      if (!project) return;

      if (deleteBtn) {
        if (!confirm(t("confirm.deleteProject"))) return;
        const currentProjectId = state.currentProjectId;
        state.projects = state.projects.filter((item) => item.id !== projectId);
        state.requirements = state.requirements.filter((req) => req.projectId !== projectId);
        state.baselines = state.baselines.filter((baseline) => baseline.projectId !== projectId);
        state.memberships = state.memberships.filter((membership) => membership.projectId !== projectId);
        if (currentProjectId === projectId) {
          state.currentProjectId = state.projects[0]?.id ?? null;
        }
        saveData();
        refreshAll();
        return;
      }

      const wrap = btn.closest(".project-card");
      if (!wrap) return;
      project.name = wrap.querySelector('[data-field="name"]')?.value.trim() || project.name;
      project.customer = wrap.querySelector('[data-field="customer"]')?.value.trim() || "";
      project.startDate = wrap.querySelector('[data-field="startDate"]')?.value || "";
      project.dueDate = wrap.querySelector('[data-field="dueDate"]')?.value || "";
      project.description = wrap.querySelector('[data-field="description"]')?.value.trim() || "";
      const systemCode = normalizeSystemCode(wrap.querySelector('[data-field="systemCode"]')?.value || "");
      if (systemCode) project.systemCode = systemCode;
      const subsystems = parseSubsystemList(wrap.querySelector('[data-field="subsystems"]')?.value || "");
      if (subsystems.length) project.subsystems = subsystems;
      saveData();
      refreshAll();
    });
  }

  if (ui.languageSelect) {
    ui.languageSelect.value = getLanguage();
    ui.languageSelect.addEventListener("change", () => {
      setLanguage(ui.languageSelect.value);
      refreshAll();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)
      return;
    if (target?.isContentEditable) return;
    const activePanel = document.querySelector(".tab-panel.active");
    if (!activePanel || activePanel.id !== "library") return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      requestDetailNav(1, { allowAutoSave: true });
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      requestDetailNav(-1, { allowAutoSave: false });
    }
  });

  applyInfoFieldState("create");
  if (!ui.createInfo.checked) {
    setMultiValues(ui.createVerificationOptions, ["Analysis"]);
  }

  startRemoteSync({
    intervalMs: 5000,
    canApply: () => !hasUnsavedDetailChanges(),
    onApplied: () => refreshAll(),
  });
}


function initCustomSelects() {
  const closeAll = () => {
    document.querySelectorAll('.select-options').forEach((panel) => panel.classList.add('hidden'));
  };

  document.addEventListener('click', (event) => {
    const option = event.target.closest('.select-option');
    if (option) {
      const wrap = option.closest('.select-wrap');
      if (!wrap) return;
      const trigger = wrap.querySelector('.select-trigger');
      const hidden = wrap.querySelector('input[type="hidden"]');
      if (!trigger || !hidden) return;
      hidden.value = option.dataset.value || '';
      trigger.textContent = option.textContent;
      wrap.querySelectorAll('.select-option').forEach((item) => {
        item.classList.toggle('active', item === option);
      });
      closeAll();
      return;
    }

    const trigger = event.target.closest('.select-trigger');
    if (trigger) {
      event.preventDefault();
      const wrap = trigger.closest('.select-wrap');
      if (!wrap) return;
      const panel = wrap.querySelector('.select-options');
      if (!panel) return;
      const isHidden = panel.classList.contains('hidden');
      closeAll();
      panel.classList.toggle('hidden', !isHidden);
      return;
    }

    closeAll();
  });
}

function enforceAuthState() {
  const user = getCurrentUser();
  ui.authModal.classList.toggle("hidden", Boolean(user));
}

function parsePipe(text) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      i += 1;
      continue;
    }
    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "|" && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }
    current += char;
  }
  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

function normalizeSystemCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
}

function parseSubsystemList(text) {
  const lines = String(text || "")
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);
  const list = [];
  lines.forEach((line) => {
    const match = line.match(/^([A-Za-z0-9]{2,3})\s*[-:]\s*(.+)$/);
    const codeRaw = match ? match[1] : line.split(/\s+/)[0];
    const label = match ? match[2].trim() : line.replace(codeRaw, "").trim() || codeRaw;
    const code = normalizeSystemCode(codeRaw);
    if (!code) return;
    list.push({ code, label });
  });
  return list;
}

let pendingNavDirection = null;
let pendingAutoNav = null;

function navigateDetail(direction, options = {}) {
  if (!options.force && hasUnsavedDetailChanges()) {
    pendingNavDirection = direction;
    showUnsavedModal();
    return;
  }
  const order = getVisibleRequirementOrder();
  if (!order.length) return;
  const currentId = getSelectedReqId();
  const index = order.findIndex((req) => req.id === currentId);
  if (index === -1) {
    const first = order[0];
    if (!first) return;
    setSelectedReqId(first.id);
    renderTree();
    renderDetail();
    return;
  }
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= order.length) return;
  setSelectedReqId(order[nextIndex].id);
  renderTree();
  renderDetail();
}

function showUnsavedModal() {
  if (!ui.unsavedModal) return;
  ui.unsavedModal.classList.remove("hidden");
}

function hideUnsavedModal() {
  if (!ui.unsavedModal) return;
  ui.unsavedModal.classList.add("hidden");
}

function handleUnsavedDecision(action) {
  const direction = pendingNavDirection;
  pendingNavDirection = null;
  hideUnsavedModal();
  if (direction !== -1 && direction !== 1) return;
  if (action === "cancel") return;
  if (action === "discard") {
    ui.detailForm.dataset.dirty = "false";
    navigateDetail(direction, { force: true });
    return;
  }
  if (action === "save") {
    ui.detailForm.requestSubmit();
    setTimeout(() => {
      navigateDetail(direction, { force: true });
    }, 0);
  }
}

function requestDetailNav(direction, options = {}) {
  const allowAutoSave = Boolean(options.allowAutoSave);
  if (allowAutoSave && ui.detailAutoSave?.checked && hasUnsavedDetailChanges()) {
    pendingAutoNav = direction;
    ui.detailForm.requestSubmit();
    return;
  }
  navigateDetail(direction);
}

function hasUnsavedDetailChanges() {
  if (ui.detailForm?.dataset?.dirty !== "true") return false;
  const requirement = getRequirement(getSelectedReqId(), state.currentProjectId);
  if (!requirement) return false;
  const current = {
    requirement: ui.detailTitle.value.trim(),
    rationale: ui.detailDesc.value.trim(),
    discipline: ui.detailDiscipline.value,
    status: ui.detailStatusSelect.value,
    parentId: ui.detailParent.value || "",
    isInfo: ui.detailInfo.checked,
    requirementType: ui.detailRequirementType.value,
    verificationMethod: getMultiValues(ui.detailVerificationOptions),
    targetQuarter: ui.detailQuarter.value,
    effort: Number(ui.detailEffort.value || 5),
    specClause: ui.detailClause.value.trim(),
    standards: splitList(ui.detailStandards.value),
    documents: splitList(ui.detailDocs.value),
  };
  const ref = {
    requirement: requirement.requirement || "",
    rationale: requirement.rationale || "",
    discipline: requirement.discipline || "",
    status: requirement.status || "",
    parentId: requirement.parentId || "",
    isInfo: Boolean(requirement.isInfo),
    requirementType: requirement.requirementType || "Functional",
    verificationMethod: normalizeVerificationList(requirement.verificationMethod || ["Analysis"]),
    targetQuarter: requirement.targetQuarter || "Faz1",
    effort: Number(requirement.effort || 5),
    specClause: requirement.specClause || "",
    standards: requirement.references?.standards || [],
    documents: requirement.references?.documents || [],
  };
  if (current.requirement !== ref.requirement) return true;
  if (current.rationale !== ref.rationale) return true;
  if (current.discipline !== ref.discipline) return true;
  if (current.status !== ref.status) return true;
  if (current.parentId !== ref.parentId) return true;
  if (current.isInfo !== ref.isInfo) return true;
  if (current.requirementType !== ref.requirementType) return true;
  if (current.verificationMethod !== ref.verificationMethod) return true;
  if (current.targetQuarter !== ref.targetQuarter) return true;
  if (current.effort !== ref.effort) return true;
  if (current.specClause !== ref.specClause) return true;
  if (!listEquals(current.standards, ref.standards)) return true;
  if (!listEquals(current.documents, ref.documents)) return true;
  return false;
}

function listEquals(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function normalizeVerificationList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function applyInfoFieldState(scope) {
  const isCreate = scope === "create";
  const isInfo = isCreate ? ui.createInfo.checked : ui.detailInfo.checked;
  const discipline = isCreate ? ui.createDiscipline : ui.detailDiscipline;
  const reqType = isCreate ? ui.createRequirementType : ui.detailRequirementType;
  const verification = isCreate ? ui.createVerificationOptions : ui.detailVerificationOptions;
  if (!discipline || !reqType || !verification) return;

  if (isInfo) {
    discipline.value = "-";
    reqType.value = "Açıklama";
    setMultiValues(verification, ["-"]);
  } else {
    if (discipline.value === "-") discipline.value = "System";
    if (reqType.value === "Açıklama") reqType.value = "Functional";
    if (getMultiValues(verification).includes("-")) setMultiValues(verification, ["Analysis"]);
  }
  discipline.disabled = isInfo;
  reqType.disabled = isInfo;
  setMultiDisabled(verification, isInfo);
}

function initMultiSelect(trigger, panel, hidden) {
  const update = () => updateMultiLabel(trigger, panel, hidden);
  update();

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    const isHidden = panel.classList.contains("hidden");
    closeAllMultiSelects();
    panel.classList.toggle("hidden", !isHidden);
  });

  panel.addEventListener("change", (event) => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    update();
  });

  document.addEventListener("click", (event) => {
    const wrap = trigger.closest(".multi-select");
    if (wrap && wrap.contains(event.target)) return;
    panel.classList.add("hidden");
  });
}

function closeAllMultiSelects() {
  document.querySelectorAll(".multi-options").forEach((panel) => panel.classList.add("hidden"));
}

function updateMultiLabel(trigger, panel, hidden) {
  const values = getMultiValues(panel);
  if (hidden) hidden.value = values.join(", ");
  if (!trigger) return;
  const placeholder = trigger.dataset.placeholder || t("select.choose");
  const labels = values
    .map((value) => panel.querySelector(`input[value="${cssEscape(value)}"]`)?.nextElementSibling?.textContent?.trim())
    .filter(Boolean);
  trigger.textContent = labels.length ? labels.join(", ") : placeholder;
}

function getMultiValues(panel) {
  if (!panel) return [];
  return Array.from(panel.querySelectorAll('input[type="checkbox"]:checked'))
    .map((input) => input.value)
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
  if (trigger) updateMultiLabel(trigger, panel, hidden);
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

function setMultiDisabled(panel, disabled) {
  if (!panel) return;
  panel.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.disabled = disabled;
  });
  const trigger = panel.closest(".multi-select")?.querySelector(".select-trigger");
  if (trigger) trigger.disabled = disabled;
}

function formatStatusCsv(value) {
  const map = {
    Draft: t("status.draft"),
    "In Review": t("status.inReview"),
    Approved: t("status.approved"),
    Rejected: t("status.rejected"),
  };
  return map[value] || value || "";
}

function formatDisciplineCsv(value) {
  if (!value || value === "-") return "-";
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

function formatRequirementTypeCsv(value) {
  if (
    value === "Açıklama" ||
    value === "AÃ§Ä±klama" ||
    value === "AÃƒÂ§Ã„Â±klama" ||
    value === "Aciklama"
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
  return map[value] || value || "";
}

function formatVerificationCsv(values) {
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

function escapePipe(value) {
  const text = String(value ?? "");
  if (text.includes("|") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/\"/g, "\"\"")}"`;
  }
  return text;
}

