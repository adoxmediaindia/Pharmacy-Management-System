import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';

export interface EmptyStateProps {
  title?: string;
  message?: string;
  symbolName?: string;
}

export function EmptyState({
  title = 'No orders found',
  message = 'There are no active orders in this status right now.',
  symbolName = 'tray',
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SymbolView
        name={symbolName as any}
        size={48}
        tintColor={theme.textSecondary + '60'}
        fallback={
          <View style={[styles.fallbackIcon, { backgroundColor: theme.backgroundElement }]}>
            <Text style={{ fontSize: 24 }}>📭</Text>
          </View>
        }
      />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    alignSelf: 'stretch',
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  fallbackIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
