import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { ActivityIndicator, View } from 'react-native';

export default function AdminLayout() {
  const { state } = useAuth();

  if (state.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  if (state.user?.role !== 'ADMIN') {
    return <Redirect href="/dashboard" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: '#FFFFFF',
        headerStyle: { backgroundColor: '#0F766E' },
        headerTitleStyle: { fontWeight: 'bold' },
        animation: 'slide_from_right',
      }}
    />
  );
}
