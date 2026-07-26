import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getBaseURL } from "../../src/constants/api";
import { useAuth } from "../../src/contexts/AuthContext";
import { s } from "../../styles/styles";

type UserData = {
  id: number;
  name: string;
  email: string;
};

export default function HomeScreen() {
  const { logout } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getBaseURL()}/me`, {
      credentials: "include",
      headers: { "ngrok-skip-browser-warning": "true" },
    })
      .then((res) => {
        console.log("me status:", res.status);
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        console.log("me data:", data);
        setUserData(data);
      })
      .catch((err) => console.log("me error:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.container}>
        <Text style={s.title}>Home</Text>

        {loading && <ActivityIndicator />}

        {userData && (
          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{userData.email}</Text>

            {userData.name && (
              <>
                <Text style={styles.label}>Name</Text>
                <Text style={styles.value}>{userData.name}</Text>
              </>
            )}
          </View>
        )}

        <TouchableOpacity style={s.button} onPress={logout}>
          <Text style={s.buttonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#F4F1FF",
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  label: {
    fontSize: 12,
    color: "#888",
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 8,
  },
  value: {
    fontSize: 16,
    color: "#1a1a1a",
    fontWeight: "500",
  },
});
