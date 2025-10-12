# NextjsV1 Explanation System

A clean and simplified explanation system for financial calculations in the NextjsV1 app. This system makes complex financial metrics accessible to users through contextual help and detailed explanations.

## Components

### 🔍 InfoTooltip

Displays contextual help for any financial metric via a hover/click tooltip.

```jsx
import { InfoTooltip } from "./explanations";

<div className="flex items-center gap-2">
  <span>Net Worth</span>
  <InfoTooltip field="totalNetWorth" />
</div>;
```

### 📊 ResultsWithExplanations

A comprehensive financial analysis display with explanations, insights, and toggle between simple/detailed views.

```jsx
import { ResultsWithExplanations } from "./explanations";

<ResultsWithExplanations
  results={calculationResults}
  formatCurrency={formatCurrency}
  carName="Tesla Model Y"
  years={5}
  detailLevel="simple"
/>;
```

### 💡 ComparisonInsights

Smart insights comparing different car options and investment alternatives.

```jsx
import { ComparisonInsights } from "./explanations";

<ComparisonInsights
  bestCar={bestResults}
  worstCar={worstResults}
  noCar={noCarValue}
  formatCurrency={formatCurrency}
  years={5}
/>;
```

## Available Explanation Fields

All explanation fields support both simple and detailed explanations:

- `totalNetWorth` - Your total wealth from this decision
- `investmentValue` - What leftover money would be worth if invested
- `carValue` - What your car will be worth if you sell it
- `totalCashOutflow` - Every shekel you'll spend on this car
- `totalCostOfOwnership` - The real cost of owning this car
- `annualFuelCost` - How much you'll spend on gas/electricity
- `effectiveRate` - The real interest rate you're paying
- `totalInterest` - Extra money you pay because of financing
- `principal` - The amount you're borrowing
- `monthlyTrueCost` - What this car really costs you per month
- `downPayment` - The upfront cash payment
- `monthlyPayment` - Your fixed monthly loan payment
- `finalPayment` - The large payment at the end of a balloon loan

## Integration

The explanation system has already been integrated into:

- ✅ NetWorthChart component (table headers have InfoTooltips)
- ✅ ComparisonSummary component (key metrics have InfoTooltips)

## Usage Examples

See `ExampleUsage.jsx` for comprehensive examples of:

- Full results display with explanations
- Custom component integration
- Table header tooltips
- Integration patterns

## File Structure

```
explanations/
├── calculationExplanations.js  # Data structure with all explanations
├── InfoTooltip.jsx             # Tooltip component for contextual help
├── ResultsWithExplanations.jsx # Enhanced results display
├── ComparisonInsights.jsx      # Smart comparison insights
├── ExampleUsage.jsx           # Usage examples and demo
├── index.js                   # Export all components
└── README.md                  # This file
```

## Extending the System

To add new explanations:

1. Add your field to `calculationExplanations.js`:

   ```js
   export const calculationExplanations = {
     // ... existing fields
     newField: {
       simple: "Short explanation",
       detailed: "Detailed explanation with context",
     },
   };
   ```

2. Use InfoTooltip with your new field:
   ```jsx
   <InfoTooltip field="newField" />
   ```

## Design Principles

- **Accessibility**: All explanations use plain language
- **Progressive Disclosure**: Simple explanations first, detailed on demand
- **Contextual**: Help appears where users need it
- **Non-intrusive**: Explanations don't clutter the UI
- **Consistent**: Same explanation patterns across all components
