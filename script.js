let deals =
  JSON.parse(localStorage.getItem("carDeals")) || [];

let currentDeal = null;
let editIndex = null;

const calculateButton =
  document.getElementById("calculateButton");

const saveButton =
  document.getElementById("saveButton");

const cancelEditButton =
  document.getElementById("cancelEditButton");

const sortDeals =
  document.getElementById("sortDeals");


calculateButton.addEventListener(
  "click",
  calculateFlip
);

saveButton.addEventListener(
  "click",
  saveDeal
);

cancelEditButton.addEventListener(
  "click",
  cancelEdit
);

sortDeals.addEventListener(
  "change",
  displayDeals
);


function clamp(number, min, max) {

  return Math.min(
    Math.max(number, min),
    max
  );
}


function calculateDealScore(
  profit,
  roi,
  repairs,
  totalCost,
  mileage
) {

  if (
    profit === null ||
    roi === null ||
    mileage === null
  ) {

    return null;
  }


  let score = 0;


  // ROI: up to 40 points
  const roiPoints =
    clamp(
      (roi / 40) * 40,
      0,
      40
    );

  score += roiPoints;


  // Profit: up to 25 points
  const profitPoints =
    clamp(
      (profit / 2000) * 25,
      0,
      25
    );

  score += profitPoints;


  // Repair burden: up to 15 points
  let repairPoints = 15;

  if (totalCost > 0) {

    const repairRatio =
      repairs / totalCost;

    if (repairRatio > 0.40) {
      repairPoints = 0;
    }

    else if (repairRatio > 0.30) {
      repairPoints = 4;
    }

    else if (repairRatio > 0.20) {
      repairPoints = 8;
    }

    else if (repairRatio > 0.10) {
      repairPoints = 12;
    }
  }

  score += repairPoints;


  // Mileage: up to 20 points
  let mileagePoints = 0;

  if (mileage <= 80000) {
    mileagePoints = 20;
  }

  else if (mileage <= 120000) {
    mileagePoints = 16;
  }

  else if (mileage <= 160000) {
    mileagePoints = 12;
  }

  else if (mileage <= 200000) {
    mileagePoints = 7;
  }

  else {
    mileagePoints = 3;
  }

  score += mileagePoints;


  return Math.round(
    clamp(score, 0, 100)
  );
}


function getScoreLabel(score) {

  if (score === null) {
    return "Unknown";
  }

  if (score >= 80) {
    return "Strong";
  }

  if (score >= 65) {
    return "Good";
  }

  if (score >= 50) {
    return "Watch Closely";
  }

  return "Weak";
}


function calculateFlip() {

  const carName =
    document.getElementById("carName")
      .value.trim();

  const mileageInput =
    document.getElementById("mileage").value;

  const buyInput =
    document.getElementById("buyPrice").value;

  const repairInput =
    document.getElementById("repairCost").value;

  const feesInput =
    document.getElementById("fees").value;

  const saleInput =
    document.getElementById("salePrice").value;

  const targetInput =
    document.getElementById("targetProfit").value;


  const hasMileage =
    mileageInput !== "";

  const hasBuy =
    buyInput !== "";

  const hasSale =
    saleInput !== "";

  const hasTarget =
    targetInput !== "";


  const mileage =
    hasMileage
      ? Number(mileageInput)
      : null;

  const buy =
    hasBuy
      ? Number(buyInput)
      : 0;

  const repairs =
    repairInput === ""
      ? 0
      : Number(repairInput);

  const fees =
    feesInput === ""
      ? 0
      : Number(feesInput);

  const sale =
    hasSale
      ? Number(saleInput)
      : 0;

  const target =
    hasTarget
      ? Number(targetInput)
      : 0;


  let result = "";


  if (hasBuy) {

    const totalCost =
      buy + repairs + fees;

    let profit = null;
    let roi = null;


    result +=
      "Total Investment: $" +
      totalCost.toFixed(2);

    result +=
      "<br>Break-Even Price: $" +
      totalCost.toFixed(2);


    if (hasSale) {

      profit =
        sale - totalCost;


      if (totalCost > 0) {

        roi =
          (profit / totalCost) * 100;

      }


      if (profit > 0) {

        result =
          "✅ Profitable<br>" +
          result;

      }

      else if (profit < 0) {

        result =
          "❌ Losing Money<br>" +
          result;

      }

      else {

        result =
          "⚖️ Break Even<br>" +
          result;
      }


      result +=
        "<br>Profit: $" +
        profit.toFixed(2);

      result +=
        "<br>ROI: " +
        roi.toFixed(1) +
        "%";
    }


    if (hasTarget) {

      const requiredSale =
        totalCost + target;

      result +=
        "<br><br>🎯 Sell For: $" +
        requiredSale.toFixed(2);
    }


    const dealScore =
      calculateDealScore(
        profit,
        roi,
        repairs,
        totalCost,
        mileage
      );


    if (dealScore !== null) {

      result +=
        "<br><br>⭐ Deal Score: " +
        dealScore +
        "/100";

      result +=
        "<br>" +
        getScoreLabel(dealScore) +
        " on entered numbers";

    }

    else if (
      hasSale &&
      !hasMileage
    ) {

      result +=
        "<br><br>Enter mileage to calculate Deal Score.";
    }


    currentDeal = {

      name:
        carName || "Unnamed Car",

      mileage: mileage,

      buy: buy,

      repairs: repairs,

      fees: fees,

      sale:
        hasSale
          ? sale
          : null,

      target:
        hasTarget
          ? target
          : null,

      totalCost: totalCost,

      profit: profit,

      roi: roi,

      score: dealScore
    };

  }


  else if (
    hasSale &&
    hasTarget
  ) {

    const maxOffer =
      sale -
      repairs -
      fees -
      target;

    result =
      "🎯 Max Purchase Price: $" +
      maxOffer.toFixed(2);

    currentDeal = null;

  }


  else {

    result =
      "⚠️ Enter a Purchase Price" +
      "<br>or Sale Price + Target Profit";

    currentDeal = null;
  }


  document.getElementById(
    "result"
  ).innerHTML = result;
}


function saveDeal() {

  calculateFlip();


  if (currentDeal === null) {
    return;
  }


  if (editIndex === null) {

    deals.push(currentDeal);

  }

  else {

    deals[editIndex] =
      currentDeal;

  }


  saveDeals();

  displayDeals();

  compareDeals();

  clearForm();

  exitEditMode();
}


function editDeal(index) {

  const deal =
    deals[index];


  document.getElementById(
    "carName"
  ).value =
    deal.name === "Unnamed Car"
      ? ""
      : deal.name;


  document.getElementById(
    "mileage"
  ).value =
    deal.mileage == null
      ? ""
      : deal.mileage;


  document.getElementById(
    "buyPrice"
  ).value =
    deal.buy;


  document.getElementById(
    "repairCost"
  ).value =
    deal.repairs;


  document.getElementById(
    "fees"
  ).value =
    deal.fees;


  document.getElementById(
    "salePrice"
  ).value =
    deal.sale == null
      ? ""
      : deal.sale;


  document.getElementById(
    "targetProfit"
  ).value =
    deal.target == null
      ? ""
      : deal.target;


  editIndex =
    index;


  saveButton.textContent =
    "Update Deal";


  cancelEditButton.classList.remove(
    "hidden"
  );


  document.getElementById(
    "result"
  ).innerHTML =
    "✏️ Editing " +
    deal.name;


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function cancelEdit() {

  clearForm();

  exitEditMode();

  document.getElementById(
    "result"
  ).innerHTML =
    "Edit cancelled";
}


function exitEditMode() {

  editIndex = null;

  saveButton.textContent =
    "Save Deal";

  cancelEditButton.classList.add(
    "hidden"
  );
}


function clearForm() {

  document.getElementById(
    "carName"
  ).value = "";

  document.getElementById(
    "mileage"
  ).value = "";

  document.getElementById(
    "buyPrice"
  ).value = "";

  document.getElementById(
    "repairCost"
  ).value = "";

  document.getElementById(
    "fees"
  ).value = "";

  document.getElementById(
    "salePrice"
  ).value = "";

  document.getElementById(
    "targetProfit"
  ).value = "";

  currentDeal = null;
}


function deleteDeal(index) {

  deals.splice(index, 1);


  if (editIndex === index) {

    clearForm();

    exitEditMode();

  }

  else if (
    editIndex !== null &&
    index < editIndex
  ) {

    editIndex--;
  }


  saveDeals();

  displayDeals();

  compareDeals();
}


function saveDeals() {

  localStorage.setItem(
    "carDeals",
    JSON.stringify(deals)
  );
}


function compareDeals() {

  const comparison =
    document.getElementById(
      "comparison"
    );


  const completedDeals =
    deals.filter(function(deal) {

      return (
        deal.profit != null &&
        deal.roi != null
      );

    });


  if (completedDeals.length < 2) {

    comparison.className = "";

    comparison.innerHTML =
      "<p class='hint'>" +
      "Save at least 2 complete deals to compare them." +
      "</p>";

    return;
  }


  let bestROI =
    completedDeals[0];

  let bestProfit =
    completedDeals[0];


  completedDeals.forEach(
    function(deal) {

      if (
        deal.roi >
        bestROI.roi
      ) {
        bestROI = deal;
      }

      if (
        deal.profit >
        bestProfit.profit
      ) {
        bestProfit = deal;
      }

    }
  );


  const scoredDeals =
    completedDeals.filter(
      function(deal) {

        return deal.score != null;

      }
    );


  let scoreText = "";


  if (scoredDeals.length > 0) {

    let bestScore =
      scoredDeals[0];


    scoredDeals.forEach(
      function(deal) {

        if (
          deal.score >
          bestScore.score
        ) {

          bestScore = deal;

        }

      }
    );


    scoreText =
      "<br>⭐ Best Deal Score: " +
      bestScore.name +
      " — " +
      bestScore.score +
      "/100";
  }


  comparison.className =
    "comparison";


  comparison.innerHTML =
    "<strong>Deal Comparison</strong>" +

    "<br><br>🏆 Best ROI: " +
    bestROI.name +
    " — " +
    bestROI.roi.toFixed(1) +
    "%" +

    "<br>💰 Highest Profit: " +
    bestProfit.name +
    " — $" +
    bestProfit.profit.toFixed(2) +

    scoreText;
}


function displayDeals() {

  const container =
    document.getElementById(
      "savedDeals"
    );


  container.innerHTML =
    "";


  if (deals.length === 0) {

    container.innerHTML =
      "<p class='hint'>" +
      "No saved deals yet." +
      "</p>";

    return;
  }


  const sortType =
    sortDeals.value;


  let sortedDeals =
    deals.map(
      function(deal, index) {

        return {

          deal: deal,

          originalIndex: index

        };

      }
    );


  if (sortType === "score") {

    sortedDeals.sort(
      function(a, b) {

        const aScore =
          a.deal.score ?? -1;

        const bScore =
          b.deal.score ?? -1;

        return bScore - aScore;

      }
    );

  }


  else if (sortType === "roi") {

    sortedDeals.sort(
      function(a, b) {

        const aROI =
          a.deal.roi ?? -Infinity;

        const bROI =
          b.deal.roi ?? -Infinity;

        return bROI - aROI;

      }
    );

  }


  else if (
    sortType === "profit"
  ) {

    sortedDeals.sort(
      function(a, b) {

        const aProfit =
          a.deal.profit ?? -Infinity;

        const bProfit =
          b.deal.profit ?? -Infinity;

        return bProfit - aProfit;

      }
    );

  }


  else if (
    sortType === "purchase"
  ) {

    sortedDeals.sort(
      function(a, b) {

        return (
          a.deal.buy -
          b.deal.buy
        );

      }
    );

  }


  else if (
    sortType === "investment"
  ) {

    sortedDeals.sort(
      function(a, b) {

        return (
          a.deal.totalCost -
          b.deal.totalCost
        );

      }
    );

  }


  else if (
    sortType === "mileage"
  ) {

    sortedDeals.sort(
      function(a, b) {

        const aMileage =
          a.deal.mileage ?? Infinity;

        const bMileage =
          b.deal.mileage ?? Infinity;

        return (
          aMileage -
          bMileage
        );

      }
    );

  }


  sortedDeals.forEach(
    function(item) {

      const deal =
        item.deal;

      const originalIndex =
        item.originalIndex;


      const mileageText =
        deal.mileage == null
          ? "Unknown"
          : Number(deal.mileage)
              .toLocaleString();


      const profitText =
        deal.profit == null
          ? "Unknown"
          : "$" +
            deal.profit.toFixed(2);


      const roiText =
        deal.roi == null
          ? "Unknown"
          : deal.roi.toFixed(1) +
            "%";


      const scoreText =
        deal.score == null
          ? "Unknown"
          : deal.score +
            "/100 — " +
            getScoreLabel(
              deal.score
            );


      const dealBox =
        document.createElement(
          "div"
        );


      dealBox.className =
        "savedDeal";


      dealBox.innerHTML = `
        <strong>${deal.name}</strong>

        <br>Mileage:
        ${mileageText}

        <br>Purchase:
        $${deal.buy.toFixed(2)}

        <br>Repairs:
        $${deal.repairs.toFixed(2)}

        <br>Fees:
        $${deal.fees.toFixed(2)}

        <br>Total Investment:
        $${deal.totalCost.toFixed(2)}

        <br>Profit:
        ${profitText}

        <br>ROI:
        ${roiText}

        <div class="dealScore">
          ⭐ Deal Score:
          ${scoreText}
        </div>
      `;


      const editButton =
        document.createElement(
          "button"
        );


      editButton.textContent =
        "Edit";


      editButton.className =
        "editButton";


      editButton.addEventListener(
        "click",
        function() {

          editDeal(
            originalIndex
          );

        }
      );


      const deleteButton =
        document.createElement(
          "button"
        );


      deleteButton.textContent =
        "Delete";


      deleteButton.className =
        "deleteButton";


      deleteButton.addEventListener(
        "click",
        function() {

          deleteDeal(
            originalIndex
          );

        }
      );


      dealBox.appendChild(
        editButton
      );

      dealBox.appendChild(
        deleteButton
      );


      container.appendChild(
        dealBox
      );

    }
  );
}


displayDeals();

compareDeals();