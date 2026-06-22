import { Stack, useRouter } from "expo-router";
import { useState } from "react";

import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { s } from "../css/styles";

import { BASE_URL } from "../constants/api";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const response = await fetch(`${BASE_URL}/login`, {
      method: "Post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "user@example.com",
        password: "password123",
      }),
    });
    const data = await response.json();
    console.log(data);
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

        <TouchableOpacity style={s.button}>
          <Text style={s.buttonText} onPress={login}>
            Log In
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/frontend/signup")}>
          <Text style={s.link}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
