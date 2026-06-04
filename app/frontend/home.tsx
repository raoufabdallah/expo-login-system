import { Stack, useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { s } from "../css/styles";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.container}>
        <Text style={s.title}>Home</Text>

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
