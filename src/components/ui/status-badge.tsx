import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { OrderStatus } from '@/constants/types';

export interface StatusBadgeProps {
  status: OrderStatus;
  style?: ViewStyle;
}

export function StatusBadge({ status, style }: StatusBadgeProps) {
  const getColors = () => {
    switch (status) {
      case 'NEW':
        return { bg: '#E0F2FE', text: '#0369A1' }; // Light blue
      case 'BILLING_PENDING':
        return { bg: '#FEF3C7', text: '#D97706' }; // Amber
      case 'BILLING_COMPLETED':
        return { bg: '#D1FAE5', text: '#059669' }; // Emerald green
      case 'PACKING_PENDING':
        return { bg: '#F3E8FF', text: '#7C3AED' }; // Purple
      case 'PACKING_COMPLETED':
        return { bg: '#ECEFEE', text: '#4B5563' }; // Greyish emerald
      case 'READY_FOR_DELIVERY':
        return { bg: '#E0F2FE', text: '#0284C7' }; // Cyan-blue
      case 'ASSIGNED':
        return { bg: '#DBEAFE', text: '#2563EB' }; // Blue
      case 'OUT_FOR_DELIVERY':
        return { bg: '#FEE2E2', text: '#DC2626' }; // Rose
      case 'DELIVERED':
        return { bg: '#D1FAE5', text: '#10B981' }; // Pure green
      case 'UNDELIVERED':
        return { bg: '#FEE2E2', text: '#EF4444' }; // Red
      default:
        return { bg: '#F3F4F6', text: '#374151' }; // Gray
    }
  };

  const { bg, text } = getColors();

  const formattedStatus = status.replace(/_/g, ' ');

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: text }]}>{formattedStatus}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
