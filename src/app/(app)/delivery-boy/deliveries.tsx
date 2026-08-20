import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput as RNTextInput,
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

export default function DeliveriesScreen() {
  const theme = useTheme();

  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expanded order details fetching
  const [orderDetails, setOrderDetails] = useState<Record<string, any>>({});
  const [detailsLoading, setDetailsLoading] = useState<Record<string, boolean>>({});

  // Form states per selected order
  const [remarks, setRemarks] = useState('');
  const [paymentType, setPaymentType] = useState<'CASH' | 'ONLINE' | 'DUE'>('CASH');
  const [submitting, setSubmitting] = useState(false);

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
        // Show active rider orders (ASSIGNED, OUT_FOR_DELIVERY)
        const riderOrders = mappedOrders.filter(
          (o: any) => o.status === 'ASSIGNED' || o.status === 'OUT_FOR_DELIVERY'
        );
        setOrders(riderOrders);
      } else {
        setError(response.error || 'Failed to retrieve assigned deliveries');
      }
    } catch (err: any) {
      console.error('Fetch rider queue error:', err);
      if (err.message === 'SESSION_EXPIRED') {
        return;
      }
      setError(err.message || 'An unexpected error occurred while loading deliveries.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders(false);
  };

  const fetchOrderDetails = async (orderId: string) => {
    setDetailsLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      const response = await ApiClient.get(`/orders/${orderId}`);
      if (response && response.success) {
        setOrderDetails((prev) => ({ ...prev, [orderId]: response.order }));
      } else {
        Alert.alert('Error', response.error || 'Failed to load order details.');
      }
    } catch (err: any) {
      console.error('Fetch order details error:', err);
      Alert.alert('Error', err.message || 'Failed to load order details from server.');
    } finally {
      setDetailsLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const toggleExpand = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
      setRemarks('');
      setPaymentType('CASH');
      // Fetch details from server
      fetchOrderDetails(orderId);
    }
  };

  const handleStartDelivery = async (orderId: string) => {
    setSubmitting(true);
    try {
      const response = await ApiClient.post('/orders/delivery/start', { orderId });
      if (response && response.success) {
        Alert.alert('Transit Started', `You have started transit for order ${orderId}.`);
        // Refresh details and queue
        fetchOrderDetails(orderId);
        fetchOrders(false);
      } else {
        Alert.alert('Error', response.error || 'Failed to start delivery.');
      }
    } catch (err: any) {
      console.error('Start delivery error:', err);
      Alert.alert('Error', err.message || 'Failed to connect to the server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteDelivery = async (orderId: string, isDelivered: boolean) => {
    const status = isDelivered ? 'DELIVERED' : 'UNDELIVERED';
    
    if (!isDelivered && !remarks.trim()) {
      Alert.alert('Remarks Required', 'Please enter a reason/remarks for the failed delivery.');
      return;
    }

    setSubmitting(true);
    try {
      const orderAmount = orders.find((o) => o.id === orderId)?.amount || 0;
      
      const payload = {
        orderId,
        status,
        paymentReceived: isDelivered ? (paymentType === 'CASH' || paymentType === 'ONLINE') : false,
        paymentAmount: isDelivered ? orderAmount : 0,
        remarks: remarks.trim() || (isDelivered ? 'Delivered successfully' : ''),
      };

      const response = await ApiClient.post('/orders/delivery/complete', payload);

      if (response && response.success) {
        Alert.alert(
          isDelivered ? 'Delivery Successful' : 'Delivery Postponed',
          `Order ${orderId} marked as ${status}.`
        );
        setExpandedOrderId(null);
        fetchOrders(true);
      } else {
        Alert.alert('Submission Failed', response.error || 'Failed to submit status update.');
      }
    } catch (err: any) {
      console.error('Complete delivery error:', err);
      Alert.alert('Error', err.message || 'Failed to connect to the server.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleString([], {
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
      <Stack.Screen options={{ title: 'My Deliveries' }} />
      
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
              title="All Deliveries Completed"
              message="You have no pending rider tasks assigned."
            />
          }
          renderItem={({ item }) => {
            const isExpanded = expandedOrderId === item.id;
            const isDetailsLoading = detailsLoading[item.id];
            const details = orderDetails[item.id] || item;

            return (
              <Card bordered style={styles.orderCard}>
                <Pressable onPress={() => toggleExpand(item.id)} style={styles.pressableHeader}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={[styles.orderId, { color: theme.text }]}>{item.id}</Text>
                      <Text style={[styles.patientName, { color: theme.textSecondary }]}>
                        {item.patientName}
                      </Text>
                    </View>
                    <View style={styles.headerRight}>
                      <StatusBadge status={item.status} />
                      <SymbolView
                        name={isExpanded ? 'chevron.up' : 'chevron.down'}
                        size={14}
                        tintColor={theme.textSecondary}
                        style={{ marginLeft: 6 }}
                      />
                    </View>
                  </View>
                </Pressable>

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {isDetailsLoading ? (
                      <ActivityIndicator size="small" color="#0F766E" style={{ marginVertical: 20 }} />
                    ) : (
                      <>
                        {/* Details Block */}
                        <View style={styles.detailsBlock}>
                          <Text style={[styles.detailsTitle, { color: theme.text }]}>Customer Info</Text>
                          <View style={styles.infoRow}>
                            <SymbolView name="mappin.and.ellipse" size={14} tintColor={theme.textSecondary} />
                            <Text style={[styles.detailsText, { color: theme.text, fontWeight: '500' }]}>
                              {details.address}
                            </Text>
                          </View>
                          <View style={[styles.infoRow, { marginTop: 6 }]}>
                            <SymbolView name="phone.fill" size={14} tintColor={theme.textSecondary} />
                            <Text style={[styles.detailsText, { color: theme.text, fontWeight: '700' }]}>
                              {details.contactNumber}
                            </Text>
                          </View>
                          <View style={[styles.infoRow, { marginTop: 6 }]}>
                            <SymbolView name="stethoscope" size={14} tintColor={theme.textSecondary} />
                            <Text style={[styles.detailsText, { color: theme.text }]}>
                              Doctor: {details.doctorName}
                            </Text>
                          </View>
                          <View style={[styles.infoRow, { marginTop: 6 }]}>
                            <SymbolView name="calendar" size={14} tintColor={theme.textSecondary} />
                            <Text style={[styles.detailsText, { color: theme.text }]}>
                              Scheduled: {formatDate(details.scheduledDateTime || details.scheduledDatetime)}
                            </Text>
                          </View>
                          <View style={[styles.infoRow, { marginTop: 6 }]}>
                            <SymbolView name="clock" size={14} tintColor={theme.textSecondary} />
                            <Text style={[styles.detailsText, { color: theme.text }]}>
                              Created: {formatDate(details.createdAt)}
                            </Text>
                          </View>
                          
                          {details.amount && (
                            <Text style={[styles.amountLabel, { color: theme.text }]}>
                              Collect Amount:{' '}
                              <Text style={{ color: '#0F766E' }}>${Number(details.amount).toFixed(2)}</Text>
                            </Text>
                          )}
                        </View>

                        {/* Completion / Start Transit Forms */}
                        <View style={styles.formContainer}>
                          {item.status === 'ASSIGNED' ? (
                            <Button
                              title="Start Delivery / Out for Delivery"
                              onPress={() => handleStartDelivery(item.id)}
                              variant="primary"
                              loading={submitting}
                              style={styles.submitBtn}
                            />
                          ) : (
                            <>
                              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                                Payment Method
                              </Text>
                              <View style={styles.paymentSelector}>
                                {(['CASH', 'ONLINE', 'DUE'] as const).map((type) => {
                                  const isSelected = paymentType === type;
                                  return (
                                    <Pressable
                                      key={type}
                                      onPress={() => setPaymentType(type)}
                                      style={[
                                        styles.paymentBtn,
                                        {
                                          backgroundColor: isSelected ? '#0F766E' : theme.background,
                                          borderColor: theme.backgroundSelected,
                                        },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.paymentBtnText,
                                          { color: isSelected ? '#FFFFFF' : theme.text },
                                        ]}
                                      >
                                        {type}
                                      </Text>
                                    </Pressable>
                                  );
                                })}
                              </View>

                              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                                Rider Remarks
                              </Text>
                              <RNTextInput
                                placeholder="e.g. Left with neighbor, gate code issues..."
                                value={remarks}
                                onChangeText={setRemarks}
                                placeholderTextColor={theme.textSecondary + '80'}
                                style={[
                                  styles.remarksInput,
                                  {
                                    color: theme.text,
                                    backgroundColor: theme.background,
                                    borderColor: theme.backgroundSelected,
                                  },
                                ]}
                              />

                              <View style={styles.actionRow}>
                                <Button
                                  title="Mark Undelivered"
                                  onPress={() => handleCompleteDelivery(item.id, false)}
                                  variant="danger"
                                  disabled={submitting}
                                  style={{ flex: 1 }}
                                />
                                <Button
                                  title="Mark Delivered"
                                  onPress={() => handleCompleteDelivery(item.id, true)}
                                  variant="success"
                                  disabled={submitting}
                                  style={{ flex: 1.2 }}
                                />
                              </View>
                            </>
                          )}
                        </View>
                      </>
                    )}
                  </View>
                )}
              </Card>
            );
          }}
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
  orderCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: 12,
  },
  pressableHeader: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  patientName: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandedContent: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  detailsBlock: {
    marginBottom: 14,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailsText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
  },
  formContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  paymentSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  paymentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  remarksInput: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  submitBtn: {
    marginTop: 8,
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
