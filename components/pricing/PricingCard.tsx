import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Feature {
  name: string;
  available: boolean;
}

export interface PricingPlan {
  name: string;
  price: {
    monthly: number;
    annual: number;
  };
  description: string;
  features: Feature[];
  cta: string;
  badge?: "popular" | "best-value";
  priceId: {
    monthly: string | null;
    annual: string | null;
  };
  dynamicPrice?: {
    basePrice: number;
    currentPrice: number;
    percentIncrease: number;
  };
  isTrial?: boolean;
  trialDays?: number;
}

interface PricingCardProps {
  plan: PricingPlan;
  isAnnual: boolean;
  onSelectPlan: (plan: PricingPlan) => void;
}

const PricingCard = ({ plan, isAnnual, onSelectPlan }: PricingCardProps) => {
  const price = isAnnual ? plan.price.annual : plan.price.monthly;
  const originalPrice = plan.dynamicPrice ? plan.dynamicPrice.basePrice : null;
  const hasDynamicPrice = plan.dynamicPrice && plan.dynamicPrice.percentIncrease > 0;

  return (
    <div className={`pricing-card ${plan.badge === "popular" ? "pricing-card-popular" : ""} ${plan.badge === "best-value" ? "pricing-card-best-value" : ""}`}>
      {plan.badge && (
        <div className={`pricing-badge ${plan.badge === "popular" ? "popular-badge" : "value-badge"}`}>
          {plan.badge === "popular" ? "Most Popular" : "Best Value"}
        </div>
      )}

      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
      <p className="text-muted-foreground mb-4">{plan.description}</p>
      
      <div className="mb-4">
        <div className="flex items-end">
          <span className="text-3xl font-bold">${price}</span>
          <span className="text-muted-foreground ml-1">/{isAnnual ? "year" : "month"}</span>
        </div>
        {hasDynamicPrice && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground line-through">${originalPrice}</span>
            <div className="group relative">
              <div className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full font-medium flex items-center">
                In demand
                <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 w-48 p-2 bg-white dark:bg-gray-800 rounded shadow-lg text-xs text-gray-600 dark:text-gray-300 z-20">
                  Current demand has increased pricing by {plan.dynamicPrice?.percentIncrease}%. We adjust prices based on demand to ensure availability.
                </div>
              </div>
            </div>
          </div>
        )}
        {plan.trialDays && (
          <div className="mt-1">
            <span className="text-sm text-brand dark:text-brand-light font-medium">Free {plan.trialDays}-day trial</span>
          </div>
        )}
        {plan.isTrial && !plan.trialDays && (
          <div className="mt-1">
            <span className="text-sm text-brand dark:text-brand-light font-medium">Free 7-day trial</span>
          </div>
        )}
      </div>

      <div className="flex-grow">
        <div className="space-y-3 mb-6">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              {feature.available ? (
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <X className="h-5 w-5 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
              )}
              <span className={feature.available ? "text-foreground" : "text-muted-foreground"}>
                {feature.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <Button 
        onClick={() => onSelectPlan(plan)}
        className={`w-full ${plan.badge ? 'bg-brand hover:bg-brand-dark' : ''}`}
        variant={plan.badge ? "default" : "outline"}
      >
        {plan.cta}
      </Button>
    </div>
  );
};

export default PricingCard;
