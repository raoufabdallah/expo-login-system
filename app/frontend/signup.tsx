import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { s } from "../css/styles";

export default function SignupScreen() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  //signup function
  const signup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill all fields");
      return;
    }
    if (password != confirmPassword) {
      alert("Password doesn't match");
      return;
    }

    try {
      const response = await fetch(
        "http://192.168.1.137:8000/frontend/signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application.json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.detail || "Signup failed");
        return;
      }

      console.log(data);

      alert("Account created!");

      router.push("/frontend/login");
    } catch (error) {
      console.log(error);
      alert("error");
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Merged into a single container */}
      <View style={s.container}>
        {/* Back Button (Stays absolutely positioned at the top) */}
        <TouchableOpacity
          onPress={() => router.push("/")}
          style={{
            position: "absolute",
            top: 60,
            left: 20,
            zIndex: 1, // Ensures it stays clickable above other elements
          }}
        >
          <Text style={{ fontSize: 18 }}>← Back</Text>
        </TouchableOpacity>

        {/* Form Content */}
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
          <Text style={s.buttonText} onPress={signup}>
            Create Account
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/frontend/login")}>
          <Text style={s.link}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
