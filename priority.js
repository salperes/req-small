export function buildPriority(model) {
  if (model === "moscow") {
    return { model, level: document.getElementById("prioMoscow").value };
  }
  if (model === "rice") {
    return {
      model,
      reach: Number(document.getElementById("prioReach").value),
      impact: Number(document.getElementById("prioImpact").value),
      confidence: Number(document.getElementById("prioConfidence").value),
      effort: Number(document.getElementById("prioEffort").value),
    };
  }
  return {
    model,
    businessValue: Number(document.getElementById("prioBv").value),
    timeCriticality: Number(document.getElementById("prioTc").value),
    riskReduction: Number(document.getElementById("prioRr").value),
    jobSize: Number(document.getElementById("prioJs").value),
  };
}

export function computeScore(priority) {
  if (!priority) return 0;
  if (priority.model === "moscow") {
    const map = { Must: 4, Should: 3, Could: 2, Wont: 1 };
    return map[priority.level] || 0;
  }
  if (priority.model === "rice") {
    return (
      ((priority.reach || 0) * (priority.impact || 0) * (priority.confidence || 0)) /
      Math.max(priority.effort || 1, 1)
    );
  }
  if (priority.model === "wsjf") {
    const cost =
      (priority.businessValue || 0) + (priority.timeCriticality || 0) + (priority.riskReduction || 0);
    return cost / Math.max(priority.jobSize || 1, 1);
  }
  return 0;
}
