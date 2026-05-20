import { Stack, useRouter } from "expo-router";
import { useState } from "react";

import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { s } from "./css/styles";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.container}>
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
          <Text style={s.buttonText}>Log In</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/signup")}>
          <Text style={s.link}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
