export interface MatchRule {
  resolution: string;
  allowed_durations: number[];
}

export interface CreditCost {
  resolution?: string;
  duration: number;
  cost_price: number;
}

export interface ModelOption {
  id: string;
  name: string;
  platform: string;
  model_brand: string;
  model_version: string;
  description: string;
  icon?: string;
  resolution: string[];
  duration: number[];
  end_frame?: boolean;
  match_rules: MatchRule[];
  decrease_credits: CreditCost[];
}

export interface UserOptions {
  resolution: string;
  duration: number;
  end_frame?: boolean;
}

export interface ImageToVideoModels {
  [key: string]: ModelOption;
}
