import { Stack, useRouter } from "expo-router";
import { useState } from "react";

import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { s } from "../../styles/styles";

import { getBaseURL } from "../../src/constants/api";
import { useAuth } from "../../src/contexts/AuthContext";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth(); // pulled from context now

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const response = await fetch(`${getBaseURL()}/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("response status:", response.status);
      console.log("data:", data);

      if (response.ok) {
        login();
        console.log("data:", JSON.stringify(data, null, 2));
      } else {
        alert("login failed");
        //console.log("data:", JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.log("error:", error);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.container}>
        <TouchableOpacity
          onPress={() => router.push("/")}
          style={{
            position: "absolute",
            top: 60,
            left: 20,
          }}
        >
          <Text style={{ fontSize: 18 }}>← Back</Text>
        </TouchableOpacity>

        <Text style={s.title}>Log In</Text>

        <TextInput
          style={s.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={s.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={s.button} onPress={handleLogin}>
          <Text style={s.buttonText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
          <Text style={s.link}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
