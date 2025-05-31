# UI Components

This document provides an overview of the UI components used in the application, located in the `components/` directory. Each section details a component's purpose, key props, and relevant internal behaviors.

## ConcentrationInputStep

**Purpose:** This component renders the UI for Step 4 of the manual dose calculation process, where the user inputs the medication's concentration.

**Role in Application:** It allows users to enter the concentration amount and select the appropriate unit (mg/ml, mcg/ml, units/ml). It also provides hints and error messages related to concentration input and unit compatibility with the previously selected dose unit.

**Key Props:**

- `concentrationAmount: string`: The current value of the concentration amount input.
- `setConcentrationAmount: (amount: string) => void`: Callback function to update the `concentrationAmount`.
- `concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml'`: The currently selected concentration unit.
- `setConcentrationUnit: (unit: 'mg/ml' | 'mcg/ml' | 'units/ml') => void`: Callback function to update the `concentrationUnit`.
- `setConcentrationHint: (hint: string | null) => void`: Callback to set a hint message related to concentration input.
- `concentrationHint: string | null`: The hint message to display.
- `doseUnit: 'mg' | 'mcg' | 'units' | 'mL'`: The dose unit selected in a previous step, used to determine compatible concentration units.
- `formError: string | null`: An error message string to display if there's an issue with the input.

**Internal Logic:**

- The component dynamically determines compatible concentration units based on the `doseUnit` prop using `getCompatibleConcentrationUnits`.
- It includes an effect (`useEffect`) that automatically changes the `concentrationUnit` to a compatible one if the current selection becomes incompatible due to a change in `doseUnit`. It also sets a hint message to inform the user about this automatic change.
- It disables radio buttons for units that are not compatible with the selected `doseUnit`.

## ReconstitutionStep

**Purpose:** This component renders the UI for Step 2c of the manual dose calculation process, specifically when the user needs to input the solution volume for medications that require reconstitution or are in a liquid form where total volume is known.

**Role in Application:** It allows users to specify the total volume of liquid (in ml) that the medication contains or will contain after reconstitution. This is crucial for calculating the final concentration if it's not directly provided.

**Key Props:**

- `solutionVolume: string`: The current value of the solution volume input.
- `setSolutionVolume: (volume: string) => void`: Callback function to update the `solutionVolume`.

**Internal Logic:**

- The component provides preset buttons for common solution volumes (1, 2, 3, 5 ml) for quick selection.
- It also includes a text input field for users to enter a custom solution volume if the presets are not suitable.
- The input field is of `numeric` keyboard type.

## SyringeIllustration

**Purpose:** This component displays a visual representation of a syringe with markings, indicating the recommended marking for the calculated dose.

**Role in Application:** It provides a clear visual guide to the user on how much medication to draw into the selected syringe. This helps in accurate dose administration.

**Key Props:**

- `syringeType: 'Insulin' | 'Standard'`: The type of syringe selected ('Insulin' or 'Standard'). This determines the unit displayed ('Units' or 'ml').
- `syringeVolume: string`: The total volume of the selected syringe (e.g., "1ml", "3ml", "100 Units"). This is used to fetch the correct marking scale.
- `recommendedMarking: string | null`: The calculated marking on the syringe to which the user should draw the medication. If null, no recommendation is highlighted.
- `syringeOptions: { [key: string]: { [key: string]: string } }`: An object containing the marking scales for different syringe types and volumes. The keys are syringe types, and the values are objects where keys are syringe volumes and values are comma-separated strings of markings.

**Internal Logic:**

- It determines the unit ('Units' or 'ml') based on `syringeType`.
- It retrieves the appropriate marking string from `syringeOptions` based on `syringeType` and `syringeVolume`.
- If no markings are available for the selected syringe, it displays a "No markings available" message.
- It parses the marking string into an array of numbers and calculates their positions on the syringe illustration relative to the `maxMarking`.
- It calculates the position of the `recommendedMarking` on the syringe.
- It renders the syringe body, a central line, individual marking lines, and their corresponding numeric labels.
- If `recommendedMarking` is provided, it highlights this mark with a distinct color and a "Draw to here" label.
- The syringe illustration is styled with fixed dimensions (width 300, height 100).
