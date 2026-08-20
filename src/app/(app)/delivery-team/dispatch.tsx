import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Alert,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { ApiClient } from '@/services/api-client';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SymbolView } from 'expo-symbols';
import { MockOrder } from '@/constants/types';

interface Rider {
  id: string;
  username: string;
  email: string;
  fullName: string;
}

export default function DispatchScreen() {
  const theme = useTheme();

  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true);
    setError(null);
    try {
      // 1. Fetch Orders
      const orderResponse = await ApiClient.get('/orders');
      let fetchedOrders: MockOrder[] = [];
      
      if (orderResponse && orderResponse.success) {
        const mappedOrders = orderResponse.orders.map((o: any) => ({
          id: o.id,
          patientName: o.patientName,
          doctorName: o.doctorName,
          address: o.address,
          contactNumber: o.contactNumber,
          scheduledDateTime: o.scheduledDatetime,
          status: o.status,
          createdAt: o.createdAt,
          createdById: o.createdById,
        }));
        
        // Filter only orders waiting for dispatch (READY_FOR_DELIVERY status)
        fetchedOrders = mappedOrders.filter((o: any) => o.status === 'READY_FOR_DELIVERY');
      } else {
        throw new Error(orderResponse.error || 'Failed to retrieve orders');
      }

      // 2. Fetch Roster of Delivery Boys
      const riderResponse = await ApiClient.get('/users/delivery-boys');
      let fetchedRiders: Rider[] = [];
      
      if (riderResponse && riderResponse.success) {
        fetchedRiders = riderResponse.deliveryBoys || [];
      } else {
        throw new Error(riderResponse.error || 'Failed to retrieve riders roster');
      }

      setOrders(fetchedOrders);
      setRiders(fetchedRiders);
    } catch (err: any) {
      console.error('Fetch dispatch details error:', err);
      if (err.message === 'SESSION_EXPIRED') {
        return;
      }
      setError(err.message || 'An unexpected error occurred while loading dispatch data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  const handleAssignDelivery = async () => {
    if (!selectedOrderId) {
      Alert.alert('Selection Required', 'Please select an order from the list first.');
      return;
    }
    if (!selectedRiderId) {
      Alert.alert('Selection Required', 'Please select a delivery boy to assign.');
      return;
    }

    const riderName = riders.find((r) => r.id === selectedRiderId)?.fullName || 'Rider';

    setSubmitting(true);
    try {
      const payload = {
        orderId: selectedOrderId,
        deliveryBoyId: selectedRiderId,
      };

      const response = await ApiClient.post('/orders/delivery/assign', payload);

      if (response && response.success) {
        Alert.alert(
          'Delivery Assigned',
          `Order ${selectedOrderId} has been assigned to ${riderName}. Notification sent to rider's device!`
        );
        setSelectedOrderId(null);
        setSelectedRiderId(null);
        // Refresh data
        fetchData(true);
      } else {
        Alert.alert('Assignment Failed', response.error || 'Failed to assign the delivery.');
      }
    } catch (err: any) {
      console.error('Assign rider error:', err);
      if (err.message === 'SESSION_EXPIRED') {
        return;
      }
      Alert.alert(
        'Error',
        err.message || 'An unexpected error occurred while connecting to the server.'
      );
    } finally {
      setSubmitting(false);
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
      <Stack.Screen options={{ title: 'Dispatch Center' }} />

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Try Again"
            onPress={() => fetchData()}
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
              title="No Shipments Ready"
              message="There are no packed orders waiting for courier assignment."
            />
          }
          ListHeaderComponent={() =>
            orders.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                  1. Select an order to dispatch, then assign a delivery driver below.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const isSelected = selectedOrderId === item.id;
            return (
              <Pressable onPress={() => setSelectedOrderId(item.id)}>
                <Card
                  bordered
                  style={[
                    styles.orderCard,
                    isSelected && {
                      borderColor: '#0F766E',
                      borderWidth: 2,
                      backgroundColor: theme.backgroundSelected,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={[styles.orderId, { color: theme.text }]}>{item.id}</Text>
                    <StatusBadge status={item.status} />
                  </View>

                  <Text style={[styles.patientName, { color: theme.text }]}>
                    Patient: {item.patientName}
                  </Text>

                  <Text style={[styles.addressText, { color: theme.textSecondary }]} numberOfLines={2}>
                    {item.address}
                  </Text>
                </Card>
              </Pressable>
            );
          }}
          ListFooterComponent={() =>
            orders.length > 0 ? (
              <View style={styles.dispatchForm}>
                <Text style={[styles.formTitle, { color: theme.text }]}>2. Select Available Rider</Text>

                <View style={styles.riderGrid}>
                  {riders.map((rider) => {
                    const isRiderSelected = selectedRiderId === rider.id;
                    const isBusy = false; // Roster queries active boys; default all active to Available
                    return (
                      <Pressable
                        key={rider.id}
                        disabled={isBusy}
                        onPress={() => setSelectedRiderId(rider.id)}
                        style={({ pressed }) => [
                          styles.riderCard,
                          {
                            backgroundColor: theme.backgroundElement,
                            borderColor: isRiderSelected ? '#0F766E' : theme.backgroundSelected,
                          },
                          isRiderSelected && { borderWidth: 2 },
                          isBusy && styles.riderCardDisabled,
                          pressed && !isBusy && styles.pressed,
                        ]}
                      >
                        <SymbolView
                          name={
                            isBusy
                              ? 'person.crop.circle.badge.xmark'
                              : 'person.crop.circle.badge.checkmark'
                          }
                          size={24}
                          tintColor={isBusy ? theme.textSecondary : '#0F766E'}
                        />
                        <Text style={[styles.riderName, { color: theme.text }]} numberOfLines={1}>
                          {rider.fullName}
                        </Text>
                        <Text style={[styles.riderStatus, { color: isBusy ? '#EF4444' : '#10B981' }]}>
                          {isBusy ? 'Busy' : 'Available'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Button
                  title="Assign & Dispatch Order"
                  onPress={handleAssignDelivery}
                  loading={submitting}
                  disabled={!selectedOrderId || !selectedRiderId}
                  style={styles.submitBtn}
                />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

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
  sectionHeader: {
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  orderCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
  },
  dispatchForm: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  riderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  riderCard: {
    width: '48%', // Allows grid layout formatting for multiple riders
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  riderCardDisabled: {
    opacity: 0.4,
  },
  riderName: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  riderStatus: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  submitBtn: {
    marginTop: 8,
  },
  pressed: {
    opacity: 0.85,
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
