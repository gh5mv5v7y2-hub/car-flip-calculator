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


function calculateFlip() {

  const carName =
    document.getElementById("carName").value.trim();

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


  const repairs =
    repairInput === ""
      ? 0
      : Number(repairInput);

  const fees =
    feesInput === ""
      ? 0
      : Number(feesInput);


  const hasBuy =
    buyInput !== "";

  const hasSale =
    saleInput !== "";

  const hasTarget =
    targetInput !== "";


  const buy =
    hasBuy
      ? Number(buyInput)
      : 0;

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


    currentDeal = {

      name:
        carName || "Unnamed Car",

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

      roi: roi
    };

  }


  else if (hasSale && hasTarget) {

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
    deal.sale === null
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
        deal.profit !== null &&
        deal.roi !== null
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
        bestROI =
          deal;
      }

      if (
        deal.profit >
        bestProfit.profit
      ) {
        bestProfit =
          deal;
      }

    }
  );


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
    bestProfit.profit.toFixed(2);
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


  if (sortType === "roi") {

    sortedDeals.sort(
      function(a, b) {

        if (
          a.deal.roi === null
        ) {
          return 1;
        }

        if (
          b.deal.roi === null
        ) {
          return -1;
        }

        return (
          b.deal.roi -
          a.deal.roi
        );

      }
    );

  }


  else if (
    sortType === "profit"
  ) {

    sortedDeals.sort(
      function(a, b) {

        if (
          a.deal.profit === null
        ) {
          return 1;
        }

        if (
          b.deal.profit === null
        ) {
          return -1;
        }

        return (
          b.deal.profit -
          a.deal.profit
        );

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


  sortedDeals.forEach(
    function(item) {

      const deal =
        item.deal;

      const originalIndex =
        item.originalIndex;


      const profitText =
        deal.profit === null
          ? "Unknown"
          : "$" +
            deal.profit.toFixed(2);


      const roiText =
        deal.roi === null
          ? "Unknown"
          : deal.roi.toFixed(1) +
            "%";


      const dealBox =
        document.createElement(
          "div"
        );


      dealBox.className =
        "savedDeal";


      dealBox.innerHTML = `
        <strong>${deal.name}</strong>

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