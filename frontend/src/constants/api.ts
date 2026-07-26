import { Platform } from "react-native";

// Change this to your active backend tunnel URL
const BACKEND_TUNNEL = "https://hypnoses-knapsack-habitant.ngrok-free.dev";

export const getBaseURL = () => {
  if (Platform.OS === "web") {
    return "http://localhost:8000";
    //return BACKEND_TUNNEL;
  }

  // Directly returns the tunnel URL for both iOS and Android devices
  return BACKEND_TUNNEL;
};
