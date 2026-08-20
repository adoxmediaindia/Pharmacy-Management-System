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

export default function BillerQueueScreen() {
  const theme = useTheme();

  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [amount, setAmount] = useState('');
  const [proofUploaded, setProofUploaded] = useState(false);
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
        }));
        // Display only pending orders for the billing queue
        const pendingBilling = mappedOrders.filter(
          (o: any) => o.status === 'NEW' || o.status === 'BILLING_PENDING'
        );
        setOrders(pendingBilling);
      } else {
        setError(response.error || 'Failed to retrieve orders');
      }
    } catch (err: any) {
      console.error('Fetch billing queue error:', err);
      if (err.message === 'SESSION_EXPIRED') {
        return;
      }
      setError(err.message || 'An unexpected error occurred while loading orders.');
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

  const toggleExpand = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
      setAmount('');
      setProofUploaded(false);
    }
  };

  const handleMockUpload = () => {
    setSubmitting(true);
    setTimeout(() => {
      setProofUploaded(true);
      setSubmitting(false);
      Alert.alert('Bill Image Uploaded', 'Mock invoice proof photo attached successfully.');
    }, 700);
  };

  const handleCompleteBilling = async (orderId: string) => {
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid bill amount.');
      return;
    }

    if (!proofUploaded) {
      Alert.alert('Validation Error', 'Please upload a bill/invoice image proof.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        orderId,
        amount: Number(amount),
        billProofUrl: 'https://example.com/mock-invoice-proof.jpg',
      };

      const response = await ApiClient.post('/orders/billing/complete', payload);

      if (response && response.success) {
        Alert.alert(
          'Billing Completed',
          `Order ${orderId} billed successfully for $${Number(amount).toFixed(2)}. Packer notification sent!`
        );
        setExpandedOrderId(null);
        // Refresh the list immediately
        fetchOrders(true);
      } else {
        Alert.alert('Submission Failed', response.error || 'Failed to submit billing.');
      }
    } catch (err: any) {
      console.error('Submit billing error:', err);
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
      <Stack.Screen options={{ title: 'Billing Queue' }} />
      
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
              title="Billing Queue Clean!"
              message="No orders waiting for billing at this time."
            />
          }
          renderItem={({ item }) => {
            const isExpanded = expandedOrderId === item.id;
            return (
              <Card bordered style={styles.orderCard}>
                <Pressable onPress={() => toggleExpand(item.id)} style={styles.pressableHeader}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={[styles.orderId, { color: theme.text }]}>{item.id}</Text>
                      <Text style={[styles.patientName, { color: theme.textSecondary }]}>
                        Patient: {item.patientName}
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
                    <View style={styles.detailsBlock}>
                      <Text style={[styles.detailsTitle, { color: theme.text }]}>Order Details</Text>
                      <Text style={[styles.detailsText, { color: theme.textSecondary }]}>
                        Doctor: {item.doctorName}
                      </Text>
                      <Text style={[styles.detailsText, { color: theme.textSecondary }]}>
                        Address: {item.address}
                      </Text>
                      <Text style={[styles.detailsText, { color: theme.textSecondary }]}>
                        Contact: {item.contactNumber}
                      </Text>
                      <Text style={[styles.detailsText, { color: theme.textSecondary }]}>
                        Scheduled Delivery: {formatDate(item.scheduledDateTime)}
                      </Text>
                      <Text style={[styles.detailsText, { color: theme.textSecondary }]}>
                        Logged At: {formatDate(item.createdAt)}
                      </Text>
                    </View>

                    {/* Prescription Preview Area */}
                    <View style={[styles.prescriptionBox, { backgroundColor: theme.background }]}>
                      <SymbolView name="doc.text.viewfinder" size={24} tintColor="#0F766E" />
                      <Text style={[styles.prescriptionText, { color: theme.text }]}>
                        Prescription File attached (tap to zoom)
                      </Text>
                    </View>

                    {/* Billing Form */}
                    <View style={styles.formContainer}>
                      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                        Enter Bill Amount ($)
                      </Text>
                      <RNTextInput
                        placeholder="0.00"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                        placeholderTextColor={theme.textSecondary + '80'}
                        style={[
                          styles.amountInput,
                          {
                            color: theme.text,
                            backgroundColor: theme.background,
                            borderColor: theme.backgroundSelected,
                          },
                        ]}
                      />

                      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                        Bill Proof Image
                      </Text>
                      <View style={styles.uploadRow}>
                        <Button
                          title={proofUploaded ? 'Change Bill Image' : 'Upload Invoice Proof'}
                          onPress={handleMockUpload}
                          variant={proofUploaded ? 'secondary' : 'primary'}
                          disabled={submitting}
                          style={{ flex: 1 }}
                        />
                        {proofUploaded && (
                          <View style={styles.successBadge}>
                            <SymbolView name="checkmark.circle.fill" size={16} tintColor="#10B981" />
                            <Text style={styles.successText}>Uploaded</Text>
                          </View>
                        )}
                      </View>

                      <Button
                        title="Complete Billing"
                        onPress={() => handleCompleteBilling(item.id)}
                        variant="success"
                        loading={submitting && proofUploaded}
                        style={styles.submitBtn}
                      />
                    </View>
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
    marginBottom: 6,
  },
  detailsText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
  },
  prescriptionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
    marginBottom: 16,
  },
  prescriptionText: {
    fontSize: 13,
    fontWeight: '600',
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
  amountInput: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 14,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  successText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 12,
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
