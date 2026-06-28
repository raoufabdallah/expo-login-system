import { Platform } from "react-native";

const getBaseURL = () => {
  if (Platform.OS === "web") return "http://localhost:8000";
  if (Platform.OS === "android")
    return "https://hypnoses-knapsack-habitant.ngrok-free.dev";
  return "https://hypnoses-knapsack-habitant.ngrok-free.dev";
};

export const BASE_URL = getBaseURL();
