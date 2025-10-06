# DoseCalculator Component

## Overview

The `DoseCalculator` component is a React component with comprehensive PropTypes validation that provides dose calculation functionality for the SafeDose application. It enhances type checking during development, catches prop misuse early, and promotes better code quality without affecting production builds or app functionality.

## Location

- **File**: `src/components/DoseCalculator.tsx`
- **Test**: `src/components/DoseCalculator.test.tsx`
- **Examples**: `src/components/DoseCalculatorIntegration.tsx`

## Features

### PropTypes Validation
The component includes **42 distinct PropTypes** with comprehensive validation:

- **Required setter functions** (13): All state setters are required to ensure proper data flow
- **Input value props** (9): Dose amounts, units, substance names, etc.
- **Calculated value props** (4): Results from dose calculations  
- **Error/hint props** (8): Error messages and helpful hints for users
- **Step management props** (2): Current step and step change handlers
- **Validation function props** (2): Custom validation functions
- **Action handler props** (3): Calculate, reset, and completion handlers
- **Configuration props** (3): Loading states, validation flags, and themes

### Validation Types Used

1. **String validation**: For text inputs like dose amounts and substance names
2. **Number validation**: For calculated values like dose volume
3. **Boolean validation**: For loading and validation flags
4. **Function validation (required)**: For required setter functions
5. **Enum validation**: For restricted values like units, steps, and themes
6. **Shape validation**: For complex objects like syringe configuration

## Props Interface

### Required Props

All setter functions are required to ensure proper state management:

```typescript
setDose: PropTypes.func.isRequired
setUnit: PropTypes.func.isRequired
setSubstanceName: PropTypes.func.isRequired
setMedicationInputType: PropTypes.func.isRequired
setConcentrationAmount: PropTypes.func.isRequired
setConcentrationUnit: PropTypes.func.isRequired
setTotalAmount: PropTypes.func.isRequired
setSolutionVolume: PropTypes.func.isRequired
setManualSyringe: PropTypes.func.isRequired
setSubstanceNameHint: PropTypes.func.isRequired
setConcentrationHint: PropTypes.func.isRequired
setTotalAmountHint: PropTypes.func.isRequired
setSyringeHint: PropTypes.func.isRequired
```

### Enum Validations

The component validates enum values to prevent invalid options:

```typescript
unit: PropTypes.oneOf(['mg', 'mcg', 'units', 'mL'])
medicationInputType: PropTypes.oneOf(['concentration', 'totalAmount', null])
concentrationUnit: PropTypes.oneOf(['mg/ml', 'mcg/ml', 'units/ml'])
currentStep: PropTypes.oneOf([
  'dose', 'medicationSource', 'concentrationInput', 'totalAmountInput',
  'reconstitution', 'syringe', 'preDoseConfirmation', 'finalResult'
])
theme: PropTypes.oneOf(['light', 'dark', 'auto'])
```

### Shape Validation

Complex objects are validated with specific shapes:

```typescript
manualSyringe: PropTypes.shape({
  type: PropTypes.oneOf(['Insulin', 'Standard']).isRequired,
  volume: PropTypes.string.isRequired,
})
```

## Usage Example

```tsx
import React from 'react';
import DoseCalculator from '../src/components/DoseCalculator';

const MyComponent = () => {
  const [dose, setDose] = React.useState('');
  const [unit, setUnit] = React.useState('mg');
  // ... other state variables

  return (
    <DoseCalculator
      dose={dose}
      setDose={setDose}
      unit={unit}
      setUnit={setUnit}
      // ... other required props
      onCalculate={() => console.log('Calculate')}
      onReset={() => console.log('Reset')}
    />
  );
};
```

## Integration with Existing Code

The component is designed to work seamlessly with the existing `useDoseCalculator` hook:

```tsx
import useDoseCalculator from '../../lib/hooks/useDoseCalculator';
import DoseCalculator from '../src/components/DoseCalculator';

const MyScreen = () => {
  const doseCalculator = useDoseCalculator({ 
    checkUsageLimit,
    trackInteraction
  });

  return (
    <DoseCalculator
      {...doseCalculator}
      onCalculate={handleCalculate}
      onReset={handleReset}
      onComplete={handleComplete}
    />
  );
};
```

## Benefits

### Development Time Benefits
- **Early error detection**: PropTypes catch prop misuse during development
- **Better developer experience**: Helpful warnings and error messages
- **Type safety**: Runtime validation complements TypeScript compile-time checking
- **Documentation**: PropTypes serve as live documentation of component interface

### Code Quality Benefits
- **Improved maintainability**: Clear prop contracts make code easier to maintain
- **Reduced bugs**: Catches common prop-related errors before they reach production
- **Enhanced debugging**: Clear error messages help identify issues quickly
- **Better testing**: Well-defined interfaces make components easier to test

### Production Benefits
- **No performance impact**: PropTypes are stripped in production builds
- **Backward compatibility**: Works alongside existing TypeScript interfaces
- **Progressive enhancement**: Can be added to existing components incrementally

## Default Props

The component provides sensible defaults for optional props:

```typescript
{
  dose: '',
  unit: 'mg',
  substanceName: '',
  medicationInputType: null,
  concentrationUnit: 'mg/ml',
  manualSyringe: { type: 'Standard', volume: '3 ml' },
  currentStep: 'dose',
  isLoading: false,
  showValidation: true,
  theme: 'auto',
  // ... other defaults
}
```

## Validation Functions

The component accepts optional validation functions for custom business logic:

```typescript
validateDoseInput?: (dose: string, unit: string) => boolean
validateConcentrationInput?: (amount: string, unit: string) => boolean
```

## Error Handling

Error props are validated and displayed appropriately:

```typescript
calculationError: PropTypes.string    // Calculation-specific errors
formError: PropTypes.string          // General form validation errors
```

## Testing

The component includes comprehensive tests that verify:

- PropTypes are properly defined
- Required props are marked correctly
- Enum validations work as expected
- Shape validations are properly configured
- Default props are reasonable
- Component renders without errors

Run tests with:
```bash
npm test -- src/components/DoseCalculator.test.tsx
```

## Verification

A verification script is included to validate PropTypes functionality:

```bash
node src/components/proptypes-verification.js
```

This script confirms that:
- PropTypes library is functional
- All validation patterns work correctly
- The component structure is properly defined
- All expected props are present and validated

## Future Enhancements

The component structure supports easy addition of:
- Additional validation rules
- New calculation steps
- Enhanced error handling
- Extended configuration options
- Additional themes and styling options

The comprehensive PropTypes validation ensures that any future changes maintain type safety and proper prop usage.