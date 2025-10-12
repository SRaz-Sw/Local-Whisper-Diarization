/**
 * Structured explanations for all calculated financial fields
 * Each explanation has a simple version (what) and detailed version (what + why + how)
 */

export const calculationExplanations = {
  investmentValue: {
    simple:
      "What your leftover money would be worth if invested in stocks instead",
    detailed:
      "After paying for the car's down payment and all ongoing costs (loan payments, insurance, fuel, maintenance), this shows what the remaining money from your initial budget would grow to if invested in the stock market at your expected return rate. This represents the opportunity cost of buying the car.",
  },

  carValue: {
    simple: "What your car will be worth if you sell it",
    detailed:
      "The estimated resale value of your car after depreciation. Cars lose value over time due to wear, mileage, and newer models entering the market. We calculate this using the depreciation percentages you've specified for each year of ownership.",
  },

  totalNetWorth: {
    simple:
      "Your total wealth from this decision (investments + car value)",
    detailed:
      "The sum of your remaining investments and your car's resale value. This is the key number for comparing different cars or comparing against not buying a car at all. A higher number means you'll be wealthier with this choice.",
  },

  totalCashOutflow: {
    simple: "Every shekel you'll spend on this car",
    detailed:
      "The complete sum of all money leaving your pocket: down payment, monthly loan payments, balloon payment, insurance, fuel, maintenance, taxes, and registration. This is the true 'sticker price' of car ownership over time.",
  },

  annualFuelCost: {
    simple: "How much you'll spend on gas/electricity each year",
    detailed:
      "Based on your annual driving distance, the car's fuel consumption rate, and current fuel prices. For electric cars, this is electricity cost; for gas/hybrid cars, this is gasoline cost. This helps you understand the ongoing 'feeding' cost of your car.",
  },

  totalCostOfOwnership: {
    simple: "The real cost of owning this car (what you lose)",
    detailed:
      "Total cash spent minus what you can recover by selling the car. This is the true 'price' you pay for using the car during your ownership period. Lower is better - it means the car is costing you less money overall.",
  },

  effectiveRate: {
    simple: "The real interest rate you're paying on your car loan",
    detailed:
      "The actual annual interest rate when considering all loan terms including down payment, monthly payments, and balloon payment. This might differ from the advertised rate. A negative rate means you're getting a discount (paying less than the sticker price).",
  },

  totalInterest: {
    simple: "Extra money you pay because of financing",
    detailed:
      "The amount above the car's price that you pay due to loan interest. If negative, congratulations - you're paying less than the sticker price due to favorable financing terms. This happens when dealers subsidize loans to make sales.",
  },

  principal: {
    simple: "The amount you're borrowing",
    detailed:
      "Car price minus your down payment. This is the actual loan amount that generates interest charges. A smaller principal means less interest paid over time.",
  },

  financingImpact: {
    simple: "How financing affects your total cost",
    detailed:
      "The difference between what you'll actually pay (including all loan payments) and the car's sticker price. Positive means financing costs you extra; negative means you're getting a discount through clever financing.",
  },

  depreciationAmount: {
    simple: "How much value your car loses each year",
    detailed:
      "Cars are depreciating assets - they lose value over time. This shows the yearly value loss in shekels. Depreciation is usually steepest in the first few years, which is why new cars can be expensive to own.",
  },

  monthlyTrueCost: {
    simple: "What this car really costs you per month",
    detailed:
      "Total cost of ownership divided by months owned. This includes everything - depreciation, interest, fuel, insurance, maintenance - not just the loan payment. This is useful for budgeting the real impact on your monthly finances.",
  },

  // Additional explanations for display values
  carPrice: {
    simple: "The total purchase price of the vehicle",
    detailed:
      "The sticker price or negotiated price you'll pay for the car before financing. This is the base amount used to calculate loan payments, down payment percentages, and depreciation. A higher car price means more money tied up in a depreciating asset instead of investments.",
  },

  downPayment: {
    simple: "The upfront cash payment when buying the car",
    detailed:
      "The initial amount you pay immediately when purchasing. A larger down payment reduces your monthly loan payments and total interest paid, but ties up more of your cash upfront that could otherwise be invested.",
  },

  monthlyPayment: {
    simple: "Your fixed monthly loan payment",
    detailed:
      "The amount you pay each month to the bank or financing company. This doesn't include other monthly costs like insurance, fuel, or maintenance - just the loan payment itself.",
  },

  finalPayment: {
    simple: "The large payment at the end of a balloon loan",
    detailed:
      "Also called a balloon payment - a large lump sum due at the end of the loan term. This keeps monthly payments lower but requires either paying a large sum, refinancing, or returning the car at the end.",
  },

  registrationCost: {
    simple: "One-time fees for registering and licensing your new car",
    detailed:
      "Government fees for license plates, registration, and initial documentation. This is typically a one-time cost when you first buy the car, though some annual registration renewals may apply.",
  },

  annualInsurance: {
    simple:
      "How much you'll pay for car insurance (mandatory + extended ) each year",
    detailed:
      "[ avg 8000 NIS ] The yearly cost of insuring your vehicle against accidents, theft, and damage. Insurance rates vary based on car value, your driving history, coverage level, and location. More expensive cars typically cost more to insure.",
  },

  annualTax: {
    simple: "Yearly taxes you'll pay on owning this car",
    detailed:
      "Annual vehicle taxes levied by the government based on factors like engine size, emissions, or vehicle value. These are ongoing ownership costs that continue each year you own the car.",
  },

  extendedWarranty: {
    simple:
      "Optional coverage for repairs beyond the standard warranty (3 years!)",
    detailed:
      "(Overly Complicates) Additional warranty protection you can purchase to cover repairs after the manufacturer's warranty expires. While it provides peace of mind, consider if the cost is worth it versus setting aside money for potential repairs.",
  },

  maintenancePerYear: {
    simple: "Expected yearly costs for servicing and repairs",
    detailed:
      "Annual maintenance costs typically increase as your car ages. This includes routine services, oil changes, brake pads, tires, and other wear items. Newer cars have lower maintenance costs while older cars require more expensive repairs and part replacements.",
  },

  // Chart and analysis explanations
  netWorthProjection: {
    simple: "Shows how your wealth changes over time with each car choice",
    detailed:
      "This chart compares your total net worth over time for each car option versus not buying any car. It combines your remaining investments with each car's resale value. The 'No Car' line shows what happens if you invest all your money instead. Use this to see which option leaves you wealthiest in the long term.",
  },

  totalCostComparison: {
    simple:
      "Compares the true cost of owning each car over different time periods",
    detailed:
      "This chart shows the total cost of ownership - what you actually pay minus what you get back when selling. It includes all expenses: payments, insurance, fuel, maintenance, and depreciation. Lower bars mean the car costs you less money overall. Compare across different time periods to see how costs evolve.",
  },

  sensitivityAnalysis: {
    simple: "See how changes in key assumptions affect your car choice",
    detailed:
      "This analysis shows how sensitive your decision is to changes in fuel prices, stock market returns, and driving patterns. Use the sliders to test different scenarios and see which car performs best under various conditions. This helps you understand the risk and robustness of your choice.",
  },

  stockMarketReturn: {
    simple: "Expected annual return on your investments",
    detailed:
      "The yearly percentage return you expect from investing your money in stocks or other investments instead of spending it on cars. Higher expected returns favor cheaper cars or no car at all, since the opportunity cost of tying up money in a depreciating asset increases.",
  },

  gasPrice: {
    simple: "Current fuel price per liter",
    detailed:
      "The price you pay for gasoline or diesel fuel. Higher fuel prices make fuel-efficient and electric vehicles more attractive. This parameter helps you understand how sensitive your car choice is to energy costs, especially important for high-mileage drivers.",
  },

  annualKm: {
    simple: "How many kilometers you drive per year",
    detailed:
      "Your annual driving distance affects fuel costs, maintenance expenses, and depreciation. Higher mileage drivers benefit more from fuel-efficient vehicles and should factor in higher maintenance costs. Lower mileage drivers might prefer focusing on lower purchase prices since fuel costs matter less.",
  },

  comparisonSummary: {
    simple:
      "Quick overview comparing your car options over different time periods",
    detailed:
      "This summary shows the best and worst car choices for each time period, along with how they compare to not buying any car. Use this to quickly identify which cars perform best over your planned ownership period and understand the financial impact of your decision.",
  },

  bestChoice: {
    simple: "The car option that leaves you with the most wealth",
    detailed:
      "This is the car choice that maximizes your total net worth after factoring in all costs, depreciation, and investment opportunities. The 'best' choice balances the car's utility with its financial impact on your overall wealth.",
  },

  worstChoice: {
    simple: "The car option that costs you the most money overall",
    detailed:
      "This represents the most expensive car choice in terms of total impact on your net worth. While it might have features you value, it costs significantly more than other options when considering all financial factors.",
  },

  choiceImpact: {
    simple: "How much money you save or lose by choosing the right car",
    detailed:
      "The financial difference between the best and worst car choices. This shows how much your car selection decision matters - larger differences mean car choice has a bigger impact on your wealth. Use this to understand if it's worth spending time optimizing your choice.",
  },
};

/**
 * Get comparison insight text between two car results
 */
export const getComparisonInsight = (
  car1Results,
  car2Results,
  noCar,
  formatCurrency,
) => {
  const diff = car1Results.totalNetWorth - car2Results.totalNetWorth;
  const diffVsNoCar = car1Results.totalNetWorth - noCar;

  return {
    simple: `This choice leaves you ${formatCurrency(Math.abs(diff))} ${diff > 0 ? "richer" : "poorer"} than the other car`,
    detailed: `Compared to the alternative car, this option ${diff > 0 ? "increases" : "decreases"} your net worth by ${formatCurrency(Math.abs(diff))}. Versus not buying any car, you'd be ${formatCurrency(Math.abs(diffVsNoCar))} ${diffVsNoCar > 0 ? "better off" : "worse off"}. Remember, cars are typically depreciating assets - the question is which option minimizes your wealth reduction while meeting your transportation needs.`,
  };
};

/**
 * Get contextual insights based on the calculation results
 */
export const getContextualInsights = (results, formatCurrency) => {
  const insights = [];

  // Check if financing is beneficial
  if (results.totalInterest < 0) {
    insights.push({
      type: "success",
      title: "Favorable Financing",
      message: `You're getting a discount of ${formatCurrency(Math.abs(results.totalInterest))} through this financing deal - you're paying less than the sticker price!`,
    });
  }

  // Check opportunity cost
  if (results.investmentValue > results.carValue) {
    const diff = results.investmentValue - results.carValue;
    insights.push({
      type: "info",
      title: "Investment Opportunity Cost",
      message: `Your investments would be worth ${formatCurrency(diff)} more than your car's value at the end of the period.`,
    });
  }

  // Check monthly burden
  if (results.monthlyTrueCost) {
    const monthlyBudgetGuideline = 15; // 15% of income rule of thumb
    insights.push({
      type: "info",
      title: "Monthly Impact",
      message: `This car's true monthly cost is ${formatCurrency(results.monthlyTrueCost)}, which includes all expenses, not just the loan payment.`,
    });
  }

  return insights;
};
