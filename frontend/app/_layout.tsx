import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../src/contexts/AuthContext";

function RootNavigation() {
  const { authState } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (authState === "loading") return;

    const inAuthedArea = segments[1] === "home"; // adjust if you add more protected screens

    if (authState === "guest" && inAuthedArea) {
      router.replace("/");
    }

    if (authState === "authed" && !inAuthedArea) {
      router.replace("/(app)/home");
    }
  }, [authState, segments]);

  if (authState === "loading") return null; // or a splash/loading component

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}
