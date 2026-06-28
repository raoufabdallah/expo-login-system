import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { s } from "../css/styles";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useLocalSearchParams();

  const userData = user ? JSON.parse(user as string) : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.container}>
        <Text style={s.title}>Home</Text>

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

        <TouchableOpacity
          style={s.button}
          onPress={() => router.push("/frontend/login")}
        >
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
