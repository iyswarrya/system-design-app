import { LLMResponse } from "./types";

async function callLLM1(topic: string): Promise<LLMResponse> {
  // TODO: Replace with actual LLM API call
  return {
    functionalRequirements: [
      "User authentication and authorization",
      "Core feature implementation",
      "Data storage and retrieval",
      "API endpoints",
      "Error handling",
    ],
    nonFunctionalRequirements: [
      "Scalability to handle 1M+ users",
      "99.9% uptime",
      "Response time < 200ms",
      "Data consistency",
      "Security and encryption",
    ],
  };
}

async function callLLM2(topic: string): Promise<LLMResponse> {
  // TODO: Replace with actual LLM API call
  return {
    functionalRequirements: [
      "User management",
      "Core business logic",
      "Data persistence",
      "RESTful API",
      "Input validation",
    ],
    nonFunctionalRequirements: [
      "Horizontal scalability",
      "High availability",
      "Low latency",
      "ACID compliance",
      "End-to-end encryption",
    ],
  };
}

function findCommonRequirements(
  reqs1: string[],
  reqs2: string[]
): string[] {
  const common: string[] = [];
  const lowerReqs2 = reqs2.map((r) => r.toLowerCase());

  for (const req1 of reqs1) {
    const lowerReq1 = req1.toLowerCase();
    for (const req2 of lowerReqs2) {
      const words1 = lowerReq1.split(/\s+/);
      const words2 = req2.split(/\s+/);
      const commonWords = words1.filter((w) => words2.includes(w));
      
      if (commonWords.length >= 2) {
        common.push(req1);
        break;
      }
    }
  }

  return common.slice(0, 5);
}

function combineTopRequirements(
  reqs1: string[],
  reqs2: string[]
): string[] {
  const combined = [...reqs1.slice(0, 3), ...reqs2.slice(0, 2)];
  return combined.slice(0, 5);
}

export async function validateRequirements(
  topic: string,
  functionalReqs: string[],
  nonFunctionalReqs: string[]
): Promise<{
  functional: string[];
  nonFunctional: string[];
}> {
  const [llm1Response, llm2Response] = await Promise.all([
    callLLM1(topic),
    callLLM2(topic),
  ]);

  const commonFunctional = findCommonRequirements(
    llm1Response.functionalRequirements,
    llm2Response.functionalRequirements
  );

  const commonNonFunctional = findCommonRequirements(
    llm1Response.nonFunctionalRequirements,
    llm2Response.nonFunctionalRequirements
  );

  const finalFunctional =
    commonFunctional.length > 0
      ? commonFunctional
      : combineTopRequirements(
          llm1Response.functionalRequirements,
          llm2Response.functionalRequirements
        );

  const finalNonFunctional =
    commonNonFunctional.length > 0
      ? commonNonFunctional
      : combineTopRequirements(
          llm1Response.nonFunctionalRequirements,
          llm2Response.nonFunctionalRequirements
        );

  return {
    functional: finalFunctional,
    nonFunctional: finalNonFunctional,
  };
}