import { state, generateId, generateGlobalReqId } from "./state.js";
import { now } from "./utils.js";

export function createRequirement(data) {
  const requirementText = String(data.requirement ?? data.title ?? "").trim();
  if (!requirementText) return null;
  if (!data.projectId) return null;
  const id = resolveId(data.id, data.projectId);
  const verificationMethod = normalizeVerification(data.verificationMethod);
  const subsystemCodes = normalizeSubsystemCodes(data.subsystemCodes, data.subsystemCode);
  const requirement = {
    id,
    globalId: data.globalId || generateGlobalReqId(),
    projectId: data.projectId,
    requirement: requirementText,
    rationale: data.rationale ?? data.description ?? "",
    discipline: data.discipline || "System",
    status: data.status || "Draft",
    parentId: data.parentId || "",
    isInfo: Boolean(data.isInfo),
    requirementType: data.requirementType || "Functional",
    verificationMethod,
    subsystemCodes,
    subsystemCode: subsystemCodes[0] || "KP0",
    targetQuarter: data.targetQuarter || "Faz1",
    effort: Number(data.effort || 5),
    specClause: data.specClause || "",
    links: { design: [], tests: [], testsSuspect: false },
    references: {
      standards: data.standards || [],
      documents: data.documents || [],
    },
    priority: null,
    score: 0,
    suspect: false,
    createdAt: now(),
    updatedAt: now(),
    versions: [],
    comments: [],
  };
  state.requirements.push(requirement);
  return requirement;
}

function normalizeVerification(value) {
  if (!value) return ["Analysis"];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveId(preferredId, projectId) {
  if (!preferredId) return generateId(projectId);
  if (state.requirements.some((req) => req.id === preferredId)) {
    return generateId(projectId);
  }
  const match = preferredId.match(/^REQ-(\d+)$/i);
  if (match) {
    const num = Number(match[1]);
    if (Number.isFinite(num)) {
      const key = projectId ?? "global";
      const current = state.projectCounters[key] || 0;
      if (num >= current) {
        state.projectCounters[key] = num;
      }
    }
  }
  return preferredId;
}

function normalizeSubsystemCodes(list, single) {
  const values = [];
  if (Array.isArray(list)) {
    list.forEach((item) => values.push(item));
  }
  if (single) values.push(single);
  const cleaned = values
    .map((item) => normalizeCode(item, 4))
    .filter(Boolean);
  if (!cleaned.length) cleaned.push("KP0");
  return Array.from(new Set(cleaned));
}

export function getRequirement(id, projectId) {
  if (!id) return null;
  if (projectId) {
    return state.requirements.find((req) => req.id === id && req.projectId === projectId) || null;
  }
  if (state.currentProjectId) {
    const scoped = state.requirements.find(
      (req) => req.id === id && req.projectId === state.currentProjectId
    );
    if (scoped) return scoped;
  }
  return state.requirements.find((req) => req.id === id) || null;
}

export function getRequirementsByProject(projectId) {
  return state.requirements.filter((req) => req.projectId === projectId);
}

export function markSuspect(requirement) {
  const changed = requirement.versions.length > 0;
  if (!changed) return;
  const children = state.requirements.filter((req) => req.parentId === requirement.id);
  children.forEach((child) => {
    child.suspect = true;
  });
  requirement.links.testsSuspect = requirement.links.tests.length > 0;
}

export function ensureApprovedId(requirement) {
  if (!requirement || (requirement.status !== "Approved" && requirement.status !== "In Review")) return null;
  const project = state.projects.find((item) => item.id === requirement.projectId);
  if (!project?.systemCode) return null;
  const systemCode = normalizeCode(project.systemCode, 3) || "SYS";
  const typeCode = getRequirementTypeCode(requirement.requirementType);
  if (!typeCode) return null;
  const basePrefix = `${systemCode}-SI-${typeCode}-`;
  if (isApprovedId(requirement.id) && requirement.id.startsWith(basePrefix)) {
    return null;
  }
  let baseNumber;
  const parent = requirement.parentId ? getRequirement(requirement.parentId, requirement.projectId) : null;
  const parsedParent = parent && isApprovedId(parent?.id) ? parseApprovedId(parent.id) : null;
  if (parsedParent) {
    baseNumber = parsedParent.baseNumber;
  } else {
    baseNumber = getNextBaseNumber(requirement.projectId, basePrefix, requirement.id);
  }
  const baseNumberStr = String(baseNumber).padStart(4, "0");
  const derivedNumber = getNextDerivedNumber(requirement.projectId, basePrefix, baseNumberStr, requirement.id);
  const newId = `${basePrefix}${baseNumberStr}.${derivedNumber}`;
  if (newId === requirement.id) return null;
  updateRequirementId(requirement.id, newId);
  requirement.id = newId;
  return newId;
}

function updateRequirementId(oldId, newId) {
  state.requirements.forEach((req) => {
    if (req.id === oldId) req.id = newId;
    if (req.parentId === oldId) req.parentId = newId;
  });
  state.baselines.forEach((baseline) => {
    if (!Array.isArray(baseline.requirements)) return;
    baseline.requirements.forEach((req) => {
      if (req.id === oldId) req.id = newId;
      if (req.parentId === oldId) req.parentId = newId;
    });
  });
}

function getNextBaseNumber(projectId, basePrefix, excludeId) {
  let max = 0;
  state.requirements.forEach((req) => {
    if (req.projectId !== projectId) return;
    if (excludeId && req.id === excludeId) return;
    if (!isApprovedId(req.id)) return;
    if (!req.id.startsWith(basePrefix)) return;
    const parsed = parseApprovedId(req.id);
    if (!parsed) return;
    const num = Number(parsed.baseNumber);
    if (Number.isFinite(num)) max = Math.max(max, num);
  });
  return max + 1;
}

function getNextDerivedNumber(projectId, basePrefix, baseNumber, excludeId) {
  let max = 0;
  const baseStr = String(baseNumber).padStart(4, "0");
  const prefix = `${basePrefix}${baseStr}.`;
  state.requirements.forEach((req) => {
    if (req.projectId !== projectId) return;
    if (excludeId && req.id === excludeId) return;
    if (!isApprovedId(req.id)) return;
    if (!req.id.startsWith(prefix)) return;
    const parsed = parseApprovedId(req.id);
    if (!parsed) return;
    const num = Number(parsed.derivedNumber);
    if (Number.isFinite(num)) max = Math.max(max, num);
  });
  return String(max + 1).padStart(4, "0");
}

function isApprovedId(value) {
  return /^[A-Z0-9]{3}-[A-Z0-9]{2}-[A-Z0-9]{2}-\d{4}\.\d{4}$/.test(String(value || ""));
}

function parseApprovedId(id) {
  const match = String(id || "").match(/^([A-Z0-9]{3})-([A-Z0-9]{2})-([A-Z0-9]{2})-(\d{4})\.(\d{4})$/);
  if (!match) return null;
  return {
    systemCode: match[1],
    staticCode: match[2],
    typeCode: match[3],
    baseNumber: match[4],
    derivedNumber: match[5],
  };
}

function normalizeCode(value, length) {
  const cleaned = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "";
  return cleaned.slice(0, length);
}

function getRequirementTypeCode(value) {
  const map = {
    Functional: "FN",
    Fonksiyonel: "FN",
    Performance: "PR",
    Performans: "PR",
    Safety: "EM",
    Emniyet: "EM",
    Security: "GV",
    Guvenlik: "GV",
    "Güvenlik": "GV",
    Regulatory: "RG",
    Regulasyon: "RG",
    "Regülasyon": "RG",
    Interface: "AR",
    Arayuz: "AR",
    "Arayüz": "AR",
    Constraint: "KS",
    Kisit: "KS",
    "Kısıt": "KS",
    Technical: "TG",
    "Teknik Gereksinim": "TG",
    Environmental: "CG",
    "Cevresel Gereksinim": "CG",
    "Çevresel Gereksinim": "CG",
    Aciklama: "AC",
    "Açıklama": "AC",
    Explanation: "AC",
  };
  return map[value] || "";
}

