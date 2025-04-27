
import { useState } from "react";

interface PriceToggleProps {
  onToggle: (isAnnual: boolean) => void;
  isAnnual: boolean;
}

const PriceToggle = ({ onToggle, isAnnual }: PriceToggleProps) => {
  return (
    <div className="flex flex-col items-center gap-2 mb-10">
      <div className="flex items-center gap-4">
        <span className={`font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
          Monthly
        </span>
        <button
          onClick={() => onToggle(!isAnnual)}
          className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            isAnnual ? "bg-brand" : "bg-gray-200 dark:bg-gray-700"
          }`}
          role="switch"
          aria-checked={isAnnual}
        >
          <span
            className={`${
              isAnnual ? "translate-x-6" : "translate-x-1"
            } inline-block h-4 w-4 rounded-full bg-white transition-transform`}
          />
        </button>
        <div className="flex items-center gap-2">
          <span className={`font-medium ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
            Annual
          </span>
          <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 rounded-full font-medium">
            Save 20%
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceToggle;
