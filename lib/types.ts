export interface Requirement {
    id: string;
    text: string;
  }
  
export interface LLMResponse {
functionalRequirements: string[];
nonFunctionalRequirements: string[];
}
  
export interface ValidationResult {
functionalRequirements: Requirement[];
nonFunctionalRequirements: Requirement[];
isValid: boolean;
feedback?: string;
}