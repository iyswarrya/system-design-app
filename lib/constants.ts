export const SYSTEM_DESIGN_TOPICS = [
    "Design a URL Shortener",
    "Design a Chat Application",
    "Design a Social Media Feed",
    "Design a Video Streaming Service",
    "Design a Search Engine",
    "Design a Distributed Cache",
    "Design a Rate Limiter",
    "Design a Notification System",
    "Design a File Storage System",
    "Design a Payment System",
  ] as const;
  
  export type SystemDesignTopic = (typeof SYSTEM_DESIGN_TOPICS)[number];