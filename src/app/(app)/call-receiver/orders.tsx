import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { ApiClient } from '@/services/api-client';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SymbolView } from 'expo-symbols';
import { MockOrder } from '@/constants/types';

export default function CallReceiverOrdersScreen() {
  const theme = useTheme();
  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true);
    setError(null);
    try {
      const response = await ApiClient.get('/orders');
      if (response && response.success) {
        // Map database schema response to MockOrder structure
        const mappedOrders = response.orders.map((o: any) => ({
          id: o.id,
          patientName: o.patientName,
          doctorName: o.doctorName,
          address: o.address,
          contactNumber: o.contactNumber,
          scheduledDateTime: o.scheduledDatetime, // Maps to DB field name
          status: o.status,
          createdAt: o.createdAt,
          createdById: o.createdById,
          amount: o.bills?.[0]?.amount || undefined,
        }));
        setOrders(mappedOrders);
      } else {
        setError(response.error || 'Failed to retrieve orders');
      }
    } catch (err: any) {
      console.error('Fetch orders error:', err);
      if (err.message === 'SESSION_EXPIRED') {
        // Auth gate layout will redirect to login automatically
        return;
      }
      setError(err.message || 'An unexpected error occurred while loading orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Re-fetch when screen becomes focused (e.g. after navigating back from creation)
  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'My Logged Orders' }} />
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Try Again"
            onPress={() => fetchOrders()}
            style={styles.retryButton}
          />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <EmptyState
              title="No Logged Orders"
              message="You haven't logged any orders in the system yet. Tap 'Create Order' on the dashboard."
            />
          }
          renderItem={({ item }) => (
            <Card bordered style={styles.orderCard}>
              <View style={styles.cardHeader}>
                <Text style={[styles.orderId, { color: theme.text }]}>{item.id}</Text>
                <StatusBadge status={item.status} />
              </View>
              
              <View style={styles.infoRow}>
                <SymbolView name="person.fill" size={14} tintColor={theme.textSecondary} />
                <Text style={[styles.infoText, { color: theme.text }]}>Patient: {item.patientName}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <SymbolView name="stethoscope" size={14} tintColor={theme.textSecondary} />
                <Text style={[styles.infoText, { color: theme.text }]}>Doctor: {item.doctorName}</Text>
              </View>

              <View style={styles.infoRow}>
                <SymbolView name="mappin.and.ellipse" size={14} tintColor={theme.textSecondary} />
                <Text style={[styles.infoText, { color: theme.text }]} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                  Created: {formatDate(item.createdAt)}
                </Text>
                {item.amount !== undefined && item.amount !== null && (
                  <Text style={[styles.amountText, { color: theme.text }]}>
                    ${Number(item.amount).toFixed(2)}
                  </Text>
                )}
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

// Minimal button fallback if needed or we can use custom style.
// Since Button is imported, let's make sure it's available or use styled Pressable

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  timeText: {
    fontSize: 11,
  },
  amountText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  retryButton: {
    minWidth: 150,
  },
});
