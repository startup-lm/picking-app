import { StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  
  return (
    <ThemedView style={styles.container}>
      <Link href="/pedidos" asChild>
        <Pressable style={styles.card} android_ripple={{ borderless: false }}>
          <ThemedText>PEDIDOS</ThemedText>
        </Pressable>
      </Link>

      <Link href="/despachos" asChild>
        <Pressable style={styles.card} android_ripple={{ borderless: false }}>
          <ThemedText>DESPACHOS</ThemedText>
        </Pressable>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 50,
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
});