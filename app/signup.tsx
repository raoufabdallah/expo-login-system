import { Stack, useRouter } from "expo-router";
import { useState } from "react";

import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { s } from "./css/styles";

export default function SignupScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.container}>
        <Text style={s.title}>Sign Up</Text>

        <TextInput
          style={s.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <TextInput
          style={s.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={s.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          style={s.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity style={s.button}>
          <Text style={s.buttonText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text style={s.link}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
