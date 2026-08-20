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

export default function PackerQueueScreen() {
  const theme = useTheme();

  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
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
          amount: o.bills?.[0]?.amount || undefined,
        }));
        // Display only pending orders for the packer queue (Billing completed / Packing pending)
        const pendingPacking = mappedOrders.filter(
          (o: any) => o.status === 'BILLING_COMPLETED' || o.status === 'PACKING_PENDING'
        );
        setOrders(pendingPacking);
      } else {
        setError(response.error || 'Failed to retrieve orders');
      }
    } catch (err: any) {
      console.error('Fetch packing queue error:', err);
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
      setProofUploaded(false);
    }
  };

  const handleMockUpload = () => {
    setSubmitting(true);
    setTimeout(() => {
      setProofUploaded(true);
      setSubmitting(false);
      Alert.alert('Packing Proof Attached', 'Mock package barcode/photo attached successfully.');
    }, 700);
  };

  const handleCompletePacking = async (orderId: string) => {
    if (!proofUploaded) {
      Alert.alert('Validation Error', 'Please upload a photo proof of the packed medicine parcel.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        orderId,
        packingProofUrl: 'https://example.com/mock-packing-proof.jpg', // Temporary placeholder proof url
      };

      const response = await ApiClient.post('/orders/packing/complete', payload);

      if (response && response.success) {
        Alert.alert(
          'Packing Completed',
          `Order ${orderId} has been packed. Dispatch team notified for delivery assignment!`
        );
        setExpandedOrderId(null);
        // Refresh the list immediately
        fetchOrders(true);
      } else {
        Alert.alert('Submission Failed', response.error || 'Failed to submit packing completion.');
      }
    } catch (err: any) {
      console.error('Submit packing error:', err);
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
      <Stack.Screen options={{ title: 'Packing Queue' }} />
      
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
              title="Packing Queue Empty!"
              message="All orders have been packed successfully."
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
                      <Text style={[styles.detailsTitle, { color: theme.text }]}>Packing Details</Text>
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
                      {item.amount !== undefined && item.amount !== null && (
                        <Text style={[styles.detailsText, { color: theme.textSecondary, fontWeight: 'bold', marginTop: 4 }]}>
                          Bill Amount: ${Number(item.amount).toFixed(2)}
                        </Text>
                      )}
                    </View>

                    {/* Checklist visual mockup */}
                    <View style={styles.checklistContainer}>
                      <Text style={[styles.inputLabel, { color: theme.text }]}>Package Checklist</Text>
                      <View style={styles.checkRow}>
                        <SymbolView name="checkmark.square.fill" size={16} tintColor="#0F766E" />
                        <Text style={[styles.checkText, { color: theme.text }]}>
                          Verify Patient Name matches Prescription
                        </Text>
                      </View>
                      <View style={styles.checkRow}>
                        <SymbolView name="checkmark.square.fill" size={16} tintColor="#0F766E" />
                        <Text style={[styles.checkText, { color: theme.text }]}>
                          Verify Quantity & Medication labels
                        </Text>
                      </View>
                      <View style={styles.checkRow}>
                        <SymbolView name="checkmark.square.fill" size={16} tintColor="#0F766E" />
                        <Text style={[styles.checkText, { color: theme.text }]}>
                          Attach Delivery Invoice Receipt to Box
                        </Text>
                      </View>
                    </View>

                    {/* Packing proof */}
                    <View style={styles.formContainer}>
                      <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                        Upload Packing Image / Proof
                      </Text>
                      <View style={styles.uploadRow}>
                        <Button
                          title={proofUploaded ? 'Retake Package Photo' : 'Capture Box / Barcode'}
                          onPress={handleMockUpload}
                          variant={proofUploaded ? 'secondary' : 'primary'}
                          disabled={submitting}
                          style={{ flex: 1 }}
                        />
                        {proofUploaded && (
                          <View style={styles.successBadge}>
                            <SymbolView name="checkmark.circle.fill" size={16} tintColor="#10B981" />
                            <Text style={styles.successText}>Ready</Text>
                          </View>
                        )}
                      </View>

                      <Button
                        title="Mark Packing Completed"
                        onPress={() => handleCompletePacking(item.id)}
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
  checklistContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(15, 118, 110, 0.05)',
    borderRadius: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  checkText: {
    fontSize: 13,
    fontWeight: '500',
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
