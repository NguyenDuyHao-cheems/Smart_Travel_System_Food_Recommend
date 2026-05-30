import { getAccessToken } from "../utils/authStorage";
import { makeAuthenticatedRequest } from "../utils/apiClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function getAnonymousId(): string {
  if (typeof window === "undefined") return "guest-unknown";
  let anonId = localStorage.getItem("anonymous_id");
  if (!anonId) {
    anonId = "guest-" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("anonymous_id", anonId);
  }
  return anonId;
}

export const interactionService = {
  logInteraction: async (params: {
    res_id?: string;
    action_type: string;
    duration_sec?: number;
    metadata?: Record<string, any>;
    search_session_id?: string;
  }) => {
    try {
      const anonymous_id = getAnonymousId();
      const token = typeof window !== "undefined" ? getAccessToken() : null;
      console.log("DEBUG INTERACTION:", { anonymous_id, hasToken: !!token, token: token ? token.substring(0, 10) + "..." : null });
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      await makeAuthenticatedRequest(`/api/v1/users/interaction`, {
        method: "POST",
        headers,
        keepalive: true,
        body: JSON.stringify({
          anonymous_id,
          res_id: params.res_id,
          action_type: params.action_type,
          duration_sec: params.duration_sec,
          metadata: params.metadata,
          search_session_id: params.search_session_id,
        }),
      });
    } catch (error) {
      console.error("Failed to log interaction", error);
    }
  }
};
