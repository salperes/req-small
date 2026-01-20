const storeKey = "rms-data-v1";
const apiStateUrl = "/api/state";
let apiEnabled = false;

const defaultSubsystems = [
  { code: "GEN", label: "Genel Sistem Gereksinimleri (Çevresel koşullar, mobilite)" },
  { code: "RAD", label: "Radyasyon ve X-Ray Üretimi (Jeneratör, Kolimatör)" },
  { code: "DET", label: "Detektör Grubu ve Veri Toplama (Sensörler)" },
  { code: "SFT", label: "Yazılım ve Görüntü Analizi (Yapay zeka, kullanıcı arayüzü)" },
  { code: "MKN", label: "Mekanik ve Konstrüksiyon (Konveyör, Şasi, Hidrolik)" },
  { code: "SNG", label: "Sağlık, Nişet ve Güvenlik (Radyasyon güvenliği, acil stop)" },
  { code: "OPT", label: "Optik" },
];

const baseData = {
  nextId: 1,
  nextUserId: 1,
  nextProjectId: 1,
  projectCounters: {},
  requirements: [],
  baselines: [],
  users: [],
  projects: [],
  memberships: [],
  currentUserId: null,
  currentProjectId: null,
};

let selectedReqId = null;

export const state = structuredClone(baseData);

export async function initState() {
  apiEnabled = await checkApi();
  const localState = loadLocal();
  if (apiEnabled) {
    const remoteState = await loadRemote();
    if (remoteState) {
      Object.assign(state, structuredClone(baseData), remoteState);
      seedDefaults();
      migrateTargetPhase();
      saveLocal();
      return;
    }
  }
  Object.assign(state, structuredClone(baseData), localState);
  seedDefaults();
  migrateTargetPhase();
  saveLocal();
  if (apiEnabled && !isEmptyState(localState)) {
    void saveRemote();
  }
}

export function getSelectedReqId() {
  return selectedReqId;
}

export function setSelectedReqId(id) {
  selectedReqId = id;
}

export function resetState() {
  localStorage.removeItem(storeKey);
  Object.assign(state, structuredClone(baseData));
  selectedReqId = null;
  seedDefaults();
  migrateTargetPhase();
  saveData();
}

export function importState(rawState) {
  if (!rawState || typeof rawState !== "object") {
    throw new Error("invalid-state");
  }
  Object.assign(state, structuredClone(baseData), rawState);
  selectedReqId = null;
  seedDefaults();
  migrateTargetPhase();
  saveData();
}

export function saveData() {
  saveLocal();
  if (apiEnabled) void saveRemote();
}

export function generateGlobalReqId() {
  const next = Number(state.nextId || 1);
  state.nextId = next + 1;
  return `REQ-${String(next).padStart(7, "0")}`;
}

export function getDefaultSubsystems() {
  return structuredClone(defaultSubsystems);
}

export function setCurrentUser(id) {
  state.currentUserId = id;
}

export function setCurrentProject(id) {
  state.currentProjectId = id;
}

export function getCurrentUser() {
  return state.users.find((user) => user.id === state.currentUserId) || null;
}

export function getCurrentProject() {
  return state.projects.find((project) => project.id === state.currentProjectId) || null;
}

export function generateId(projectId) {
  const key = projectId ?? "global";
  const current = state.projectCounters[key] || 0;
  const next = current + 1;
  state.projectCounters[key] = next;
  return `REQ-${String(next).padStart(4, "0")}`;
}

function loadLocal() {
  const saved = localStorage.getItem(storeKey);
  if (!saved) return structuredClone(baseData);
  try {
    const parsed = JSON.parse(saved);
    return { ...structuredClone(baseData), ...parsed };
  } catch {
    return structuredClone(baseData);
  }
}

function saveLocal() {
  localStorage.setItem(storeKey, JSON.stringify(state));
}

async function checkApi() {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

async function loadRemote() {
  try {
    const res = await fetch(apiStateUrl, { cache: "no-store" });
    if (res.status === 204) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function saveRemote() {
  try {
    await fetch(apiStateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
  } catch {
    // Best-effort persistence; localStorage remains the fallback.
  }
}

function isEmptyState(candidate) {
  if (!candidate) return true;
  return (
    !candidate.requirements?.length &&
    !candidate.baselines?.length &&
    !candidate.users?.length &&
    !candidate.projects?.length
  );
}

function seedDefaults() {
  const adminEmail = "admin@example.com";
  const existingAdmin = state.users.find((user) => user.email.toLowerCase() === adminEmail);
  if (existingAdmin) {
    existingAdmin.role = "admin";
    existingAdmin.password = "admin";
  } else {
    const admin = {
      id: state.nextUserId++,
      name: "Admin",
      email: adminEmail,
      password: "admin",
      role: "admin",
    };
    state.users.push(admin);
  }
  if (!state.projects.length) {
    const project = {
      id: state.nextProjectId++,
      name: "Demo Project",
      customer: "",
      startDate: "",
      dueDate: "",
      description: "Seed project",
      systemCode: "SYS",
      subsystems: structuredClone(defaultSubsystems),
    };
    state.projects.push(project);
    state.memberships.push({
      userId: state.users[0].id,
      projectId: project.id,
      role: "editor",
    });
  }
  if (!state.currentProjectId) {
    state.currentProjectId = state.projects[0]?.id ?? null;
  }
  migrateRequirementFields();
  migrateRequirementIds();
  rebuildProjectCounters();
  migrateProjectFields();
  migrateGlobalIds();
  migrateSubsystemCodes();
}

function migrateTargetPhase() {
  const map = {
    Q1: "Faz1",
    Q2: "Faz2",
    Q3: "Faz3",
    Q4: "Faz4",
  };
  state.requirements.forEach((req) => {
    if (map[req.targetQuarter]) req.targetQuarter = map[req.targetQuarter];
  });
  state.baselines.forEach((baseline) => {
    if (!Array.isArray(baseline.requirements)) return;
    baseline.requirements.forEach((req) => {
      if (map[req.targetQuarter]) req.targetQuarter = map[req.targetQuarter];
    });
  });
}

function migrateRequirementFields() {
  const migrateRecord = (req) => {
    if (!req || typeof req !== "object") return;
    if (!req.requirement && req.title) {
      req.requirement = req.title;
    }
    if (!req.rationale && req.description) {
      req.rationale = req.description;
    }
    if ("title" in req) delete req.title;
    if ("description" in req) delete req.description;
    if (Array.isArray(req.versions)) {
      req.versions.forEach((version) => {
        if (version?.snapshot) migrateRecord(version.snapshot);
      });
    }
  };

  state.requirements.forEach(migrateRecord);
  state.baselines.forEach((baseline) => {
    if (!Array.isArray(baseline.requirements)) return;
    baseline.requirements.forEach(migrateRecord);
  });
}

function migrateRequirementIds() {
  if (!state.requirements.length) return;
  const byProject = {};
  state.requirements.forEach((req) => {
    if (!/^REQ-\d+$/i.test(String(req.id || ""))) return;
    const key = req.projectId || "global";
    byProject[key] = byProject[key] || [];
    byProject[key].push(req);
  });

  const idMap = new Map();
  Object.values(byProject).forEach((list) => {
    const ordered = list
      .map((req, index) => ({ req, index }))
      .sort((a, b) => {
        const aNum = parseReqNumber(a.req.id);
        const bNum = parseReqNumber(b.req.id);
        if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
        if (a.req.createdAt && b.req.createdAt) {
          return new Date(a.req.createdAt) - new Date(b.req.createdAt);
        }
        return a.index - b.index;
      });
    ordered.forEach(({ req }, idx) => {
      const newId = `REQ-${String(idx + 1).padStart(4, "0")}`;
      idMap.set(req.id, newId);
    });
  });

  state.requirements.forEach((req) => {
    const newId = idMap.get(req.id);
    if (newId) req.id = newId;
  });

  state.requirements.forEach((req) => {
    if (req.parentId && idMap.has(req.parentId)) {
      req.parentId = idMap.get(req.parentId);
    }
  });

  state.baselines.forEach((baseline) => {
    if (!Array.isArray(baseline.requirements)) return;
    baseline.requirements.forEach((req) => {
      const newId = idMap.get(req.id);
      if (newId) req.id = newId;
      if (req.parentId && idMap.has(req.parentId)) {
        req.parentId = idMap.get(req.parentId);
      }
    });
  });
}

function parseReqNumber(id) {
  const match = String(id || "").match(/^REQ-(\d+)$/i);
  if (!match) return Number.NaN;
  return Number(match[1]);
}

function rebuildProjectCounters() {
  const counters = {};
  for (const req of state.requirements) {
    const match = String(req.id || "").match(/^REQ-(\d+)$/i);
    if (!match) continue;
    const num = Number(match[1]);
    if (!Number.isFinite(num)) continue;
    const projectId = req.projectId || "global";
    counters[projectId] = Math.max(counters[projectId] || 0, num);
  }
  state.projectCounters = counters;
}

function migrateProjectFields() {
  state.projects.forEach((project) => {
    if (!project.systemCode) project.systemCode = "SYS";
    if (!Array.isArray(project.subsystems) || !project.subsystems.length) {
      project.subsystems = structuredClone(defaultSubsystems);
    }
  });
}

function migrateGlobalIds() {
  rebuildGlobalCounter();
  state.requirements.forEach((req) => {
    if (!req.globalId) {
      req.globalId = generateGlobalReqId();
      return;
    }
    const match = String(req.globalId).match(/^REQ-(\d{4,7})$/i);
    if (match) {
      req.globalId = `REQ-${match[1].padStart(7, "0")}`;
    }
  });
  state.baselines.forEach((baseline) => {
    if (!Array.isArray(baseline.requirements)) return;
    baseline.requirements.forEach((req) => {
      if (!req.globalId) {
        const source = state.requirements.find((item) => item.id === req.id);
        req.globalId = source?.globalId || generateGlobalReqId();
      } else {
        const match = String(req.globalId).match(/^REQ-(\d{4,7})$/i);
        if (match) {
          req.globalId = `REQ-${match[1].padStart(7, "0")}`;
        }
      }
    });
  });
}

function rebuildGlobalCounter() {
  let max = 0;
  state.requirements.forEach((req) => {
    const match = String(req.globalId || "").match(/^REQ-(\d{4,7})$/i);
    if (!match) return;
    const num = Number(match[1]);
    if (Number.isFinite(num)) max = Math.max(max, num);
  });
  state.nextId = Math.max(state.nextId || 1, max + 1);
}

function migrateSubsystemCodes() {
  state.requirements.forEach((req) => {
    if (!req.subsystemCode) req.subsystemCode = "GEN";
  });
  state.baselines.forEach((baseline) => {
    if (!Array.isArray(baseline.requirements)) return;
    baseline.requirements.forEach((req) => {
      if (!req.subsystemCode) req.subsystemCode = "GEN";
    });
  });
}

