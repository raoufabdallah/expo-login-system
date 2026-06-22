import { Platform } from "react-native";

const getBaseURL = () => {
  if (Platform.OS === "web") return "http://localhost:8000";
  if (Platform.OS === "android") return "http://10.0.2.2:8000";
  return "http://192.168.1.137:8000";
};

export const BASE_URL = getBaseURL();
