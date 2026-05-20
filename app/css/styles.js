import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 24,
    gap: 16,
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 16,
  },

  input: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },

  button: {
    backgroundColor: "#6C47FF",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  outlineButton: {
    borderWidth: 2,
    borderColor: "#6C47FF",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  outlineButtonText: {
    color: "#6C47FF",
    fontSize: 16,
    fontWeight: "600",
  },

  link: {
    color: "#6C47FF",
    fontSize: 14,
    marginTop: 4,
  },
});
