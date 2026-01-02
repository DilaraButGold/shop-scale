import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      {/* index.tsx dosyasını ana ekran olarak ayarla 
        ve varsayılan başlığı (header) gizle 
      */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}