import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { ApiClient } from '@/services/api-client';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SymbolView } from 'expo-symbols';
import { Button } from '@/components/ui/button';

export default function ActivityLogScreen() {
  const theme = useTheme();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true);
    setError(null);
    try {
      const response = await ApiClient.get('/users/activity-logs');
      if (response && response.success) {
        setLogs(response.activityLogs || []);
      } else {
        setError(response.error || 'Failed to retrieve activity logs');
      }
    } catch (err: any) {
      console.error('Fetch logs error:', err);
      if (err.message === 'SESSION_EXPIRED') {
        return;
      }
      setError(err.message || 'An unexpected error occurred while loading activity logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchLogs();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs(false);
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
      <Stack.Screen options={{ title: 'Admin Activity Logs' }} />
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Try Again" onPress={() => fetchLogs()} style={styles.retryButton} />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <EmptyState title="No Activity Logs" message="No user activity has been logged in the system yet." />
          }
          renderItem={({ item }) => (
            <Card bordered style={styles.logCard}>
              <View style={styles.logHeader}>
                <View style={styles.userRow}>
                  <SymbolView name="person.circle.fill" size={18} tintColor="#0F766E" />
                  <Text style={[styles.userName, { color: theme.text }]}>
                    {item.user?.fullName || 'System'} ({item.user?.role?.name?.replace('_', ' ') || 'SYSTEM'})
                  </Text>
                </View>
                <Text style={[styles.logTime, { color: theme.textSecondary }]}>
                  {formatDate(item.timestamp)}
                </Text>
              </View>

              <Text style={[styles.logAction, { color: theme.text }]}>
                {item.action}
              </Text>

              <View style={styles.logDetails}>
                {item.orderId ? (
                  <Text style={[styles.orderLabel, { color: theme.textSecondary }]}>
                    Order: <Text style={[styles.orderId, { color: theme.text }]}>{item.orderId}</Text>
                  </Text>
                ) : (
                  <Text style={[styles.orderLabel, { color: theme.textSecondary }]}>
                    N/A
                  </Text>
                )}
                
                {(item.previousStatus || item.newStatus) && (
                  <View style={styles.badgeRow}>
                    {item.previousStatus && (
                      <>
                        <StatusBadge status={item.previousStatus} />
                        <SymbolView name="arrow.right" size={12} tintColor={theme.textSecondary} style={{ marginHorizontal: 6 }} />
                      </>
                    )}
                    {item.newStatus && <StatusBadge status={item.newStatus} />}
                  </View>
                )}
              </View>
            </Card>
          )}
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
  logCard: {
    padding: 16,
    marginBottom: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 6,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
  },
  logTime: {
    fontSize: 11,
  },
  logAction: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
    marginVertical: 4,
  },
  logDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  orderLabel: {
    fontSize: 13,
  },
  orderId: {
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
