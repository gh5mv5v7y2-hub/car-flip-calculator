let deals = JSON.parse(localStorage.getItem("carDeals")) || [];
let currentDeal = null;
let editIndex = null;

const calculateButton = document.getElementById("calculateButton");
const saveButton = document.getElementById("saveButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const sortDeals = document.getElementById("sortDeals");

calculateButton.addEventListener("click", calculateFlip);
saveButton.addEventListener("click", saveDeal);
cancelEditButton.addEventListener("click", cancelEdit);
sortDeals.addEventListener("change", displayDeals);

function clamp(number, min, max) {
  return Math.min(Math.max(number, min), max);
}

function money(number) {
  const value = Number(number);
  const sign = value < 0 ? "-" : "";
  return sign + "$" + Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function offerMoney(number) {
  return number < 0 ? "No viable offer" : money(number);
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function safeURL(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
  } catch (error) {
    return null;
  }
  return null;
}

function readNumber(id) {
  const value = document.getElementById(id).value;
  return value === "" ? null : Number(value);
}

function readText(id) {
  return document.getElementById(id).value.trim();
}

function calculateROI(profit, totalCost) {
  if (profit === null || totalCost <= 0) return null;
  return (profit / totalCost) * 100;
}

function baseRisk(profitLikely, profitWorst) {
  if (profitLikely === null || profitWorst === null) return null;

  if (profitLikely <= 0) {
    return {
      label: "High Risk",
      icon: "🔴",
      rank: 3,
      message: "The likely scenario is not profitable."
    };
  }

  if (profitWorst >= 0) {
    return {
      label: "Low Risk",
      icon: "🟢",
      rank: 1,
      message: "Even the worst-case repair scenario stays profitable."
    };
  }

  const downside = Math.abs(profitWorst);
  const downsideRatio = downside / profitLikely;

  if (downside <= 1000 && downsideRatio <= 0.5) {
    return {
      label: "Medium Risk",
      icon: "🟡",
      rank: 2,
      message: "Likely profit: " + money(profitLikely) + " | Worst case: " + money(profitWorst)
    };
  }

  return {
    label: "High Risk",
    icon: "🔴",
    rank: 3,
    message: "Worst-case losses are large compared with the likely profit."
  };
}

function applyMechanicRisk(risk, mechanicAssessment) {
  if (!risk) return null;
  const output = { ...risk };

  if (mechanicAssessment === "minor" && output.rank < 2) {
    output.label = "Medium Risk";
    output.icon = "🟡";
    output.rank = 2;
    output.message += " Mechanic input flagged minor concerns, so risk was raised.";
  } else if (mechanicAssessment === "major" && output.rank < 3) {
    output.label = "High Risk";
    output.icon = "🔴";
    output.rank = 3;
    output.message += " Mechanic input flagged major concerns, so risk was raised.";
  } else if (mechanicAssessment === "avoid") {
    output.label = "High Risk";
    output.icon = "🔴";
    output.rank = 3;
    output.message += " Mechanic input says avoid this vehicle.";
  }

  return output;
}

function calculateDealScore(profit, roi, repairs, totalCost, mileage, mechanicAssessment = "none") {
  if (profit === null || roi === null || mileage === null) return null;

  let score = 0;
  score += clamp(roi, 0, 40);
  score += clamp((profit / 2000) * 25, 0, 25);

  let repairPoints = 15;
  if (totalCost > 0) {
    const repairRatio = repairs / totalCost;
    if (repairRatio > 0.40) repairPoints = 0;
    else if (repairRatio > 0.30) repairPoints = 4;
    else if (repairRatio > 0.20) repairPoints = 8;
    else if (repairRatio > 0.10) repairPoints = 12;
  }
  score += repairPoints;

  if (mileage <= 80000) score += 20;
  else if (mileage <= 120000) score += 16;
  else if (mileage <= 160000) score += 12;
  else if (mileage <= 200000) score += 7;
  else score += 3;

  const mechanicPenalty = {
    none: 0,
    no_major: 0,
    minor: 8,
    major: 20,
    avoid: 35
  }[mechanicAssessment] ?? 0;

  score -= mechanicPenalty;
  return Math.round(clamp(score, 0, 100));
}

function getScoreLabel(score) {
  if (score === null) return "Unknown";
  if (score >= 80) return "Strong";
  if (score >= 65) return "Good";
  if (score >= 50) return "Watch Closely";
  return "Weak";
}

function calculateOfferGuide(sale, fees, repairBest, repairLikely, repairWorst, target) {
  if (sale === null) return null;
  const desiredProfit = target ?? 0;
  return {
    safeOffer: sale - fees - repairWorst - desiredProfit,
    targetOffer: target === null ? null : sale - fees - repairLikely - target,
    absoluteMax: sale - fees - repairBest
  };
}

function getPurchaseVerdict(buy, offers, hasTarget) {
  if (buy === null || offers === null) return "";
  if (buy <= offers.safeOffer) return "🟢 Asking price is within the Safe Offer range.";
  if (hasTarget && offers.targetOffer !== null && buy <= offers.targetOffer) {
    return "🟡 Above Safe Offer, but the likely scenario still hits your target profit.";
  }
  if (buy <= offers.absoluteMax) {
    return hasTarget
      ? "🟠 Speculative price — below break-even, but it misses your target profit."
      : "🟠 Speculative price — profitable only if repairs stay below the worst case.";
  }
  return "🔴 Too expensive — even the best repair scenario loses money.";
}

function mechanicStatusLabel(value) {
  return {
    none: "Not inspected",
    listing_review: "Mechanic reviewed listing / symptoms",
    in_person: "Mechanic inspected in person"
  }[value] || "Not inspected";
}

function mechanicAssessmentLabel(value) {
  return {
    none: "No assessment",
    no_major: "No major concerns",
    minor: "Minor concerns",
    major: "Major concerns",
    avoid: "Avoid"
  }[value] || "No assessment";
}

function resaleSourceLabel(value) {
  return {
    rough: "Rough estimate / not verified",
    active_comps: "Checked similar active listings",
    sold_comps: "Checked recent sold comps"
  }[value] || "Rough estimate / not verified";
}

function calculateInputConfidence({
  mileage,
  buy,
  repairBestInput,
  repairLikelyInput,
  repairWorstInput,
  sale,
  mechanicStatus,
  mechanicAssessment,
  resaleSource
}) {
  let points = 0;
  const weakSpots = [];

  const coreComplete =
    mileage !== null &&
    buy !== null &&
    repairBestInput !== null &&
    repairLikelyInput !== null &&
    repairWorstInput !== null &&
    sale !== null;

  if (coreComplete) points += 2;
  else weakSpots.push("some core deal inputs are still missing");

  if (mechanicStatus === "in_person") points += 3;
  else if (mechanicStatus === "listing_review") points += 1;
  else weakSpots.push("no mechanic review is recorded");

  if (mechanicStatus !== "none" && mechanicAssessment !== "none") points += 1;

  if (resaleSource === "sold_comps") points += 2;
  else if (resaleSource === "active_comps") points += 1;
  else weakSpots.push("resale value is still a rough estimate");

  const repairRangeComplete =
    repairBestInput !== null &&
    repairLikelyInput !== null &&
    repairWorstInput !== null;

  if (repairRangeComplete) points += 1;
  else weakSpots.push("repair range is incomplete");

  let label = "Low";
  let icon = "🔴";

  if (points >= 8) {
    label = "High";
    icon = "🟢";
  } else if (points >= 4) {
    label = "Medium";
    icon = "🟡";
  }

  const message = weakSpots.length
    ? "Main uncertainty: " + weakSpots.join("; ") + "."
    : "The main inputs are supported by a complete repair range, market comps and mechanic input.";

  return { label, icon, points, message };
}

function normalizeDeal(deal) {
  const oldRepairs = Number(deal.repairs ?? 0);
  const repairBest = Number(deal.repairBest ?? oldRepairs);
  const repairLikely = Number(deal.repairLikely ?? oldRepairs);
  const repairWorst = Number(deal.repairWorst ?? oldRepairs);
  const buy = Number(deal.buy ?? 0);
  const fees = Number(deal.fees ?? 0);
  const mileage = deal.mileage == null ? null : Number(deal.mileage);
  const sale = deal.sale == null ? null : Number(deal.sale);
  const target = deal.target == null ? null : Number(deal.target);
  const listingUrl = deal.listingUrl ?? "";
  const notes = deal.notes ?? "";
  const mechanicStatus = deal.mechanicStatus ?? "none";
  const mechanicAssessment = deal.mechanicAssessment ?? "none";
  const mechanicNotes = deal.mechanicNotes ?? "";
  const resaleSource = deal.resaleSource ?? "rough";

  const totalBest = buy + fees + repairBest;
  const totalLikely = buy + fees + repairLikely;
  const totalWorst = buy + fees + repairWorst;
  const profitBest = sale === null ? null : sale - totalBest;
  const profitLikely = sale === null ? null : sale - totalLikely;
  const profitWorst = sale === null ? null : sale - totalWorst;
  const roiBest = calculateROI(profitBest, totalBest);
  const roiLikely = calculateROI(profitLikely, totalLikely);
  const roiWorst = calculateROI(profitWorst, totalWorst);
  const score = calculateDealScore(profitLikely, roiLikely, repairLikely, totalLikely, mileage, mechanicAssessment);
  const risk = applyMechanicRisk(baseRisk(profitLikely, profitWorst), mechanicAssessment);
  const offers = calculateOfferGuide(sale, fees, repairBest, repairLikely, repairWorst, target);
  const confidence = calculateInputConfidence({
    mileage,
    buy,
    repairBestInput: repairBest,
    repairLikelyInput: repairLikely,
    repairWorstInput: repairWorst,
    sale,
    mechanicStatus,
    mechanicAssessment,
    resaleSource
  });

  return {
    name: deal.name || "Unnamed Car",
    listingUrl,
    notes,
    mechanicStatus,
    mechanicAssessment,
    mechanicNotes,
    resaleSource,
    mileage,
    buy,
    repairBest,
    repairLikely,
    repairWorst,
    fees,
    sale,
    target,
    totalBest,
    totalLikely,
    totalWorst,
    profitBest,
    profitLikely,
    profitWorst,
    roiBest,
    roiLikely,
    roiWorst,
    score,
    risk,
    confidence,
    offers
  };
}

deals = deals.map(normalizeDeal);
saveDeals();

function calculateFlip() {
  const carName = readText("carName");
  const listingUrl = readText("listingUrl");
  const notes = readText("notes");
  const mechanicStatus = document.getElementById("mechanicStatus").value;
  const mechanicAssessment = document.getElementById("mechanicAssessment").value;
  const mechanicNotes = readText("mechanicNotes");
  const resaleSource = document.getElementById("resaleSource").value;

  const mileage = readNumber("mileage");
  const buy = readNumber("buyPrice");
  const repairBestInput = readNumber("repairBest");
  const repairLikelyInput = readNumber("repairLikely");
  const repairWorstInput = readNumber("repairWorst");
  const feesInput = readNumber("fees");
  const sale = readNumber("salePrice");
  const target = readNumber("targetProfit");

  const fees = feesInput ?? 0;
  const repairBest = repairBestInput ?? 0;
  const repairLikely = repairLikelyInput ?? repairBest;
  const repairWorst = repairWorstInput ?? repairLikely;

  const enteredNumbers = [mileage, buy, repairBestInput, repairLikelyInput, repairWorstInput, feesInput, sale, target];
  if (enteredNumbers.some(value => value !== null && value < 0)) {
    showResult("⚠️ Values cannot be negative.");
    currentDeal = null;
    return;
  }

  if (repairBest > repairLikely || repairLikely > repairWorst) {
    showResult("⚠️ Repair estimates should go:<br>Best ≤ Likely ≤ Worst");
    currentDeal = null;
    return;
  }

  if (buy !== null) {
    const totalBest = buy + repairBest + fees;
    const totalLikely = buy + repairLikely + fees;
    const totalWorst = buy + repairWorst + fees;
    const profitBest = sale === null ? null : sale - totalBest;
    const profitLikely = sale === null ? null : sale - totalLikely;
    const profitWorst = sale === null ? null : sale - totalWorst;
    const roiBest = calculateROI(profitBest, totalBest);
    const roiLikely = calculateROI(profitLikely, totalLikely);
    const roiWorst = calculateROI(profitWorst, totalWorst);
    const score = calculateDealScore(profitLikely, roiLikely, repairLikely, totalLikely, mileage, mechanicAssessment);
    const risk = applyMechanicRisk(baseRisk(profitLikely, profitWorst), mechanicAssessment);
    const offers = calculateOfferGuide(sale, fees, repairBest, repairLikely, repairWorst, target);
    const confidence = calculateInputConfidence({
      mileage,
      buy,
      repairBestInput,
      repairLikelyInput,
      repairWorstInput,
      sale,
      mechanicStatus,
      mechanicAssessment,
      resaleSource
    });

    let result = "";

    if (profitLikely !== null) {
      if (profitLikely > 0) result += "<strong>✅ Likely Case: Profitable</strong>";
      else if (profitLikely < 0) result += "<strong>❌ Likely Case: Losing Money</strong>";
      else result += "<strong>⚖️ Likely Case: Break Even</strong>";
    }

    const scenario = (title, repairs, total, profit, roi) => `
      <div class="scenarioBox">
        <strong>${title}</strong>
        <br>Repairs: ${money(repairs)}
        ${sale !== null ? `<br>Resale assumption: ${money(sale)} <span class="hint">(held constant)</span>` : ""}
        <br>Total Investment: ${money(total)}
        ${sale !== null ? `<br>Profit: ${money(profit)}<br>ROI: ${roi === null ? "Unknown" : roi.toFixed(1) + "%"}` : ""}
      </div>
    `;

    result += scenario("Best Case", repairBest, totalBest, profitBest, roiBest);
    result += scenario("Likely Case", repairLikely, totalLikely, profitLikely, roiLikely);
    result += scenario("Worst Case", repairWorst, totalWorst, profitWorst, roiWorst);

    if (sale !== null) {
      result += `
        <div class="riskBox">
          <strong>🧮 Scenario Assumptions</strong>
          <br>Resale is held at ${money(sale)} across Best / Likely / Worst.
          <br>Only the repair estimate changes between those three scenarios.
          <br>Resale source: ${escapeHTML(resaleSourceLabel(resaleSource))}.
          <br><span class="hint">FlipGuard does not verify market value, repair prices or seller claims.</span>
        </div>
      `;
    }

    if (offers !== null) {
      const purchaseVerdict = getPurchaseVerdict(buy, offers, target !== null);
      result += `
        <div class="offerBox">
          <div class="offerMain">💵 What Should I Offer?</div>
          <br><strong>🛡️ Safe Offer:</strong> ${offerMoney(offers.safeOffer)}
          <br><span class="hint">${target !== null
            ? "Keeps your " + money(target) + " target profit even in the worst repair case."
            : "Worst-case break-even ceiling. Enter a Target Profit for a safer profit goal."}</span>
          ${offers.targetOffer !== null ? `<br><br><strong>🎯 Target Offer:</strong> ${offerMoney(offers.targetOffer)}<br><span class="hint">Hits your target profit in the likely repair case.</span>` : ""}
          <br><br><strong>🚫 Absolute Max:</strong> ${offerMoney(offers.absoluteMax)}
          <br><span class="hint">Above this price, even the best repair scenario loses money.</span>
          <br><br><strong>${purchaseVerdict}</strong>
          <br><br><span class="hint">Repair sensitivity: if likely repairs rise by $500, Target Offer drops by $500. If worst-case repairs rise by $500, Safe Offer drops by $500.</span>
        </div>
      `;
    }

    if (mechanicStatus !== "none" || mechanicAssessment !== "none" || mechanicNotes) {
      result += `
        <div class="riskBox">
          <strong>🔧 Mechanic / Inspection Input</strong>
          <br>Status: ${escapeHTML(mechanicStatusLabel(mechanicStatus))}
          <br>Assessment: ${escapeHTML(mechanicAssessmentLabel(mechanicAssessment))}
          ${mechanicNotes ? `<br>Notes: ${escapeHTML(mechanicNotes)}` : ""}
          <br><span class="hint">Mechanic input can raise risk, but it never overrides the financial downside.</span>
        </div>
      `;
    }

    result += `
      <div class="riskBox">
        <strong>${confidence.icon} Input Confidence: ${confidence.label}</strong>
        <br>${escapeHTML(confidence.message)}
        <br><span class="hint">This measures how well-supported the inputs are. It does not change the profit math.</span>
      </div>
    `;

    if (risk !== null) {
      result += `
        <div class="riskBox">
          <strong>${risk.icon} Deal Risk: ${risk.label}</strong>
          <br>${escapeHTML(risk.message)}
          <br><span class="hint">Deal Risk is based on projected margin/downside, with mechanic concerns only able to make it more conservative. Input Confidence is shown separately.</span>
        </div>
      `;
    }

    if (score !== null) result += "<br>⭐ Deal Score: " + score + "/100 — " + getScoreLabel(score);

    currentDeal = {
      name: carName || "Unnamed Car",
      listingUrl,
      notes,
      mechanicStatus,
      mechanicAssessment,
      mechanicNotes,
      resaleSource,
      mileage,
      buy,
      repairBest,
      repairLikely,
      repairWorst,
      fees,
      sale,
      target,
      totalBest,
      totalLikely,
      totalWorst,
      profitBest,
      profitLikely,
      profitWorst,
      roiBest,
      roiLikely,
      roiWorst,
      score,
      risk,
      confidence,
      offers
    };

    showResult(result);
    return;
  }

  if (sale !== null && target !== null) {
    const offers = calculateOfferGuide(sale, fees, repairBest, repairLikely, repairWorst, target);
    showResult(
      "<strong>💵 What Should I Offer?</strong>" +
      "<br><br>🛡️ Safe Offer: " + offerMoney(offers.safeOffer) +
      "<br>🎯 Target Offer: " + offerMoney(offers.targetOffer) +
      "<br>🚫 Absolute Max: " + offerMoney(offers.absoluteMax) +
      "<br><br><span class='hint'>If likely repairs rise by $500, Target Offer drops by $500. If worst-case repairs rise by $500, Safe Offer drops by $500.</span>"
    );
    currentDeal = null;
    return;
  }

  showResult("⚠️ Enter a Purchase Price<br>or<br>Expected Sale Price + Target Profit");
  currentDeal = null;
}

function showResult(html) {
  document.getElementById("result").innerHTML = html;
}

function saveDeal() {
  calculateFlip();
  if (currentDeal === null) return;

  if (editIndex === null) deals.push(currentDeal);
  else deals[editIndex] = currentDeal;

  saveDeals();
  displayDeals();
  compareDeals();
  clearForm();
  exitEditMode();
  showResult("✅ Deal saved.");
}

function editDeal(index) {
  const deal = deals[index];
  document.getElementById("carName").value = deal.name === "Unnamed Car" ? "" : deal.name;
  document.getElementById("listingUrl").value = deal.listingUrl ?? "";
  document.getElementById("notes").value = deal.notes ?? "";
  document.getElementById("mechanicStatus").value = deal.mechanicStatus ?? "none";
  document.getElementById("mechanicAssessment").value = deal.mechanicAssessment ?? "none";
  document.getElementById("mechanicNotes").value = deal.mechanicNotes ?? "";
  document.getElementById("resaleSource").value = deal.resaleSource ?? "rough";
  document.getElementById("mileage").value = deal.mileage ?? "";
  document.getElementById("buyPrice").value = deal.buy ?? "";
  document.getElementById("repairBest").value = deal.repairBest ?? "";
  document.getElementById("repairLikely").value = deal.repairLikely ?? "";
  document.getElementById("repairWorst").value = deal.repairWorst ?? "";
  document.getElementById("fees").value = deal.fees ?? "";
  document.getElementById("salePrice").value = deal.sale ?? "";
  document.getElementById("targetProfit").value = deal.target ?? "";

  editIndex = index;
  saveButton.textContent = "Update Deal";
  cancelEditButton.classList.remove("hidden");
  showResult("✏️ Editing " + escapeHTML(deal.name));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelEdit() {
  clearForm();
  exitEditMode();
  showResult("Edit cancelled.");
}

function exitEditMode() {
  editIndex = null;
  saveButton.textContent = "Save Deal";
  cancelEditButton.classList.add("hidden");
}

function clearForm() {
  [
    "carName", "listingUrl", "notes", "mechanicNotes", "mileage", "buyPrice",
    "repairBest", "repairLikely", "repairWorst", "fees", "salePrice", "targetProfit"
  ].forEach(id => {
    document.getElementById(id).value = "";
  });

  document.getElementById("mechanicStatus").value = "none";
  document.getElementById("mechanicAssessment").value = "none";
  document.getElementById("resaleSource").value = "rough";
  currentDeal = null;
}

function deleteDeal(index) {
  deals.splice(index, 1);

  if (editIndex === index) {
    clearForm();
    exitEditMode();
  } else if (editIndex !== null && index < editIndex) {
    editIndex--;
  }

  saveDeals();
  displayDeals();
  compareDeals();
}

function saveDeals() {
  localStorage.setItem("carDeals", JSON.stringify(deals));
}

function compareDeals() {
  const comparison = document.getElementById("comparison");
  const completedDeals = deals.filter(deal => deal.profitLikely !== null && deal.roiLikely !== null);

  if (completedDeals.length < 2) {
    comparison.className = "";
    comparison.innerHTML = "<p class='hint'>Save at least 2 complete deals to compare them.</p>";
    return;
  }

  let bestROI = completedDeals[0];
  let bestProfit = completedDeals[0];
  let safestDeal = completedDeals[0];

  completedDeals.forEach(deal => {
    if (deal.roiLikely > bestROI.roiLikely) bestROI = deal;
    if (deal.profitLikely > bestProfit.profitLikely) bestProfit = deal;
    if ((deal.risk?.rank ?? 99) < (safestDeal.risk?.rank ?? 99)) safestDeal = deal;
  });

  comparison.className = "comparison";
  comparison.innerHTML =
    "<strong>Deal Comparison</strong>" +
    "<br><br>🏆 Best Likely ROI: " + escapeHTML(bestROI.name) + " — " + bestROI.roiLikely.toFixed(1) + "%" +
    "<br>💰 Highest Likely Profit: " + escapeHTML(bestProfit.name) + " — " + money(bestProfit.profitLikely) +
    "<br>🛡️ Lowest Risk: " + escapeHTML(safestDeal.name) + " — " +
    (safestDeal.risk ? safestDeal.risk.icon + " " + safestDeal.risk.label : "Unknown");
}

function displayDeals() {
  const container = document.getElementById("savedDeals");
  container.innerHTML = "";

  if (deals.length === 0) {
    container.innerHTML = "<p class='hint'>No saved deals yet.</p>";
    return;
  }

  const sortType = sortDeals.value;
  let sortedDeals = deals.map((deal, index) => ({ deal, originalIndex: index }));

  const sorters = {
    risk: (a, b) => (a.deal.risk?.rank ?? 99) - (b.deal.risk?.rank ?? 99),
    score: (a, b) => (b.deal.score ?? -1) - (a.deal.score ?? -1),
    roi: (a, b) => (b.deal.roiLikely ?? -Infinity) - (a.deal.roiLikely ?? -Infinity),
    profit: (a, b) => (b.deal.profitLikely ?? -Infinity) - (a.deal.profitLikely ?? -Infinity),
    purchase: (a, b) => a.deal.buy - b.deal.buy,
    investment: (a, b) => a.deal.totalLikely - b.deal.totalLikely,
    mileage: (a, b) => (a.deal.mileage ?? Infinity) - (b.deal.mileage ?? Infinity)
  };

  if (sorters[sortType]) sortedDeals.sort(sorters[sortType]);

  sortedDeals.forEach(item => {
    const deal = item.deal;
    const originalIndex = item.originalIndex;
    const mileageText = deal.mileage === null ? "Unknown" : deal.mileage.toLocaleString();
    const profitRange = deal.sale === null ? "Unknown" : money(deal.profitWorst) + " to " + money(deal.profitBest);
    const likelyROI = deal.roiLikely === null ? "Unknown" : deal.roiLikely.toFixed(1) + "%";
    const scoreText = deal.score === null ? "Unknown" : deal.score + "/100 — " + getScoreLabel(deal.score);
    const riskText = deal.risk === null ? "Unknown" : deal.risk.icon + " " + deal.risk.label;
    const confidenceText = deal.confidence ? deal.confidence.icon + " " + deal.confidence.label : "Unknown";
    const safeOfferText = deal.offers === null ? "Unknown" : offerMoney(deal.offers.safeOffer);

    const dealBox = document.createElement("div");
    dealBox.className = "savedDeal";
    dealBox.innerHTML = `
      <strong>${escapeHTML(deal.name)}</strong>
      <br>Mileage: ${mileageText}
      <br>Purchase: ${money(deal.buy)}
      <br>Repair Range: ${money(deal.repairBest)} — ${money(deal.repairWorst)}
      <br>Likely Repairs: ${money(deal.repairLikely)}
      <br>Expected Resale: ${deal.sale === null ? "Unknown" : money(deal.sale)}
      <br>Resale Source: ${escapeHTML(resaleSourceLabel(deal.resaleSource))}
      <br>Likely Investment: ${money(deal.totalLikely)}
      <br>Profit Range: ${profitRange}
      <br>Likely ROI: ${likelyROI}
      <div class="riskRating">Deal Risk: ${riskText}</div>
      <div class="riskRating">Input Confidence: ${confidenceText}</div>
      <div class="dealScore">⭐ Deal Score: ${scoreText}</div>
      <div class="offerSummary">🛡️ Safe Offer: ${safeOfferText}</div>
    `;

    if (deal.mechanicStatus !== "none" || deal.mechanicAssessment !== "none" || deal.mechanicNotes) {
      const mechanicBox = document.createElement("div");
      mechanicBox.className = "dealNotes";
      mechanicBox.textContent =
        "Mechanic: " + mechanicStatusLabel(deal.mechanicStatus) +
        " · " + mechanicAssessmentLabel(deal.mechanicAssessment) +
        (deal.mechanicNotes ? " · " + deal.mechanicNotes : "");
      dealBox.appendChild(mechanicBox);
    }

    if (deal.notes) {
      const notesBox = document.createElement("div");
      notesBox.className = "dealNotes";
      notesBox.textContent = "Notes: " + deal.notes;
      dealBox.appendChild(notesBox);
    }

    const validListing = safeURL(deal.listingUrl);
    if (validListing) {
      const link = document.createElement("a");
      link.href = validListing;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "listingLink";
      link.textContent = "🔗 Open Listing";
      dealBox.appendChild(link);
    }

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.className = "editButton";
    editButton.addEventListener("click", () => editDeal(originalIndex));

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className = "deleteButton";
    deleteButton.addEventListener("click", () => deleteDeal(originalIndex));

    dealBox.appendChild(editButton);
    dealBox.appendChild(deleteButton);
    container.appendChild(dealBox);
  });
}

displayDeals();
compareDeals();
