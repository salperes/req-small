export function buildReqIf(projectName, requirements) {
  const timestamp = new Date().toISOString();
  const specObjects = requirements
    .map((req) => buildSpecObject(req))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<REQ-IF xmlns="http://www.omg.org/spec/ReqIF/20110401/reqif.xsd">
  <THE-HEADER>
    <REQ-IF-HEADER IDENTIFIER="REQIF-HEADER" CREATION-TIME="${timestamp}">
      <TITLE>${escapeXml(projectName || "RMS Project")}</TITLE>
    </REQ-IF-HEADER>
  </THE-HEADER>
  <CORE-CONTENT>
    <REQ-IF-CONTENT>
      <SPEC-OBJECTS>
        ${specObjects}
      </SPEC-OBJECTS>
    </REQ-IF-CONTENT>
  </CORE-CONTENT>
</REQ-IF>`;
}

export function parseReqIf(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const specObjects = Array.from(doc.getElementsByTagName("SPEC-OBJECT"));
  return specObjects.map((spec) => {
    const id = spec.getAttribute("IDENTIFIER") || "";
    const values = getAttributeValues(spec);
    return {
      id,
      requirement: values.TITLE || values.Name || id,
      rationale: values.DESCRIPTION || "",
      discipline: values.DISCIPLINE || "System",
      status: values.STATUS || "Draft",
      parentId: values.PARENT || "",
      isInfo: values.INFO === "true",
      requirementType: values.TYPE || "Functional",
      verificationMethod: normalizeVerification(splitCsv(values.VERIFICATION)),
      targetQuarter: values.QUARTER || "Faz1",
      effort: Number(values.EFFORT || 5),
      standards: splitCsv(values.STANDARDS),
      documents: splitCsv(values.DOCUMENTS),
    };
  });
}

function buildSpecObject(req) {
  const attrs = [
    attrValue("TITLE", req.requirement),
    attrValue("DESCRIPTION", req.rationale),
    attrValue("DISCIPLINE", req.discipline),
    attrValue("STATUS", req.status),
    attrValue("PARENT", req.parentId || ""),
    attrValue("INFO", req.isInfo ? "true" : "false"),
    attrValue("TYPE", req.requirementType || "Functional"),
    attrValue("VERIFICATION", formatList(req.verificationMethod || ["Analysis"])),
    attrValue("QUARTER", req.targetQuarter),
    attrValue("EFFORT", String(req.effort ?? "")),
    attrValue("STANDARDS", (req.references?.standards || []).join(", ")),
    attrValue("DOCUMENTS", (req.references?.documents || []).join(", ")),
  ].join("");

  return `<SPEC-OBJECT IDENTIFIER="${escapeXml(req.id)}">
    <VALUES>${attrs}</VALUES>
  </SPEC-OBJECT>`;
}

function attrValue(name, value) {
  return `<ATTRIBUTE-VALUE-STRING>
    <DEFINITION>
      <ATTRIBUTE-DEFINITION-STRING-REF>${escapeXml(name)}</ATTRIBUTE-DEFINITION-STRING-REF>
    </DEFINITION>
    <THE-VALUE>${escapeXml(value ?? "")}</THE-VALUE>
  </ATTRIBUTE-VALUE-STRING>`;
}

function getAttributeValues(spec) {
  const map = {};
  const values = Array.from(spec.getElementsByTagName("ATTRIBUTE-VALUE-STRING"));
  values.forEach((node) => {
    const def = node.getElementsByTagName("ATTRIBUTE-DEFINITION-STRING-REF")[0];
    const val = node.getElementsByTagName("THE-VALUE")[0];
    if (!def || !val) return;
    const key = def.textContent.trim();
    map[key] = val.textContent || "";
  });
  return map;
}

function normalizeVerification(list) {
  if (Array.isArray(list) && list.length) return list;
  return ["Analysis"];
}

function splitCsv(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatList(value) {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
