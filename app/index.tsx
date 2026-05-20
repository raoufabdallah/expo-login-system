import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

import { s } from "./css/styles";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={s.container}>
      <Text style={s.title}>Welcome</Text>

      <TouchableOpacity style={s.button} onPress={() => router.push("/login")}>
        <Text style={s.buttonText}>Log In</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.outlineButton}
        onPress={() => router.push("/signup")}
      >
        <Text style={s.outlineButtonText}>Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}
