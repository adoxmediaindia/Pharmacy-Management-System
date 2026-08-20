import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  Platform,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { Card } from '@/components/ui/card';
import { MOCK_DASHBOARD_STATS } from '@/constants/mock-data';
import { UserRole } from '@/constants/types';

export default function DashboardScreen() {
  const { state, logout } = useAuth();
  const theme = useTheme();

  const user = state.user;
  const role = user?.role || 'CALL_RECEIVER';
  const fullName = user?.fullName || 'Pharmacy Staff';

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  // Helper to format role names for screen rendering
  const getRoleNameFormatted = (r: UserRole) => {
    return r.replace('_', ' ');
  };

  // Header Component
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: '#0D9488' }]}>
      <SafeAreaView style={styles.safeHeader}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerWelcome}>Welcome back,</Text>
            <Text style={styles.headerName}>{fullName}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{getRoleNameFormatted(role)}</Text>
            </View>
          </View>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <SymbolView
              name="power"
              size={22}
              tintColor="#FFFFFF"
              fallback={<Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Exit</Text>}
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );

  // Stat item helper
  const renderStatCard = (label: string, value: number | string, iconName: string, color: string = '#0D9488') => (
    <Card style={styles.statCard} bordered>
      <View style={styles.statCardRow}>
        <View>
          <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
        </View>
        <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
          <SymbolView name={iconName as any} size={24} tintColor={color} />
        </View>
      </View>
    </Card>
  );

  // Nav card button helper
  const renderNavigationCard = (title: string, description: string, route: string, iconName: string) => (
    <Pressable
      onPress={() => router.push(route as any)}
      style={({ pressed }) => [
        styles.navCardPressable,
        pressed && styles.pressed,
      ]}
    >
      <Card style={styles.navCard} bordered>
        <View style={styles.navCardContent}>
          <View style={[styles.navIconContainer, { backgroundColor: '#0F766E20' }]}>
            <SymbolView name={iconName as any} size={28} tintColor="#0F766E" />
          </View>
          <View style={styles.navTextContainer}>
            <Text style={[styles.navTitle, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.navDesc, { color: theme.textSecondary }]}>{description}</Text>
          </View>
          <SymbolView name="chevron.right" size={16} tintColor={theme.textSecondary} />
        </View>
      </Card>
    </Pressable>
  );

  // Dashboards for different roles
  const renderAdminDashboard = () => {
    const stats = MOCK_DASHBOARD_STATS.admin;
    return (
      <View style={styles.dashboardContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Operations Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.gridHalf}>{renderStatCard('Total Orders', stats.totalOrders, 'doc.text.fill', '#0284C7')}</View>
          <View style={styles.gridHalf}>{renderStatCard('Pending Bills', stats.pendingBilling, 'creditcard.fill', '#D97706')}</View>
          <View style={styles.gridHalf}>{renderStatCard('Pending Packing', stats.pendingPacking, 'shippingbox.fill', '#7C3AED')}</View>
          <View style={styles.gridHalf}>{renderStatCard('Ready Delivery', stats.readyForDelivery, 'bicycle', '#2563EB')}</View>
        </View>
        {renderStatCard('Delivered Orders', stats.delivered, 'checkmark.circle.fill', '#10B981')}

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 12 }]}>Management Links</Text>
        {renderNavigationCard('Activity Logs', 'Audit all system transitions and logs.', '/admin/activity', 'list.bullet.indent')}
      </View>
    );
  };

  const renderCallReceiverDashboard = () => {
    const stats = MOCK_DASHBOARD_STATS.callReceiver;
    return (
      <View style={styles.dashboardContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Intake Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.gridHalf}>{renderStatCard('Total Logged', stats.createdOrdersCount, 'plus.circle.fill', '#0F766E')}</View>
          <View style={styles.gridHalf}>{renderStatCard('Pending', stats.pendingOrdersCount, 'clock.fill', '#D97706')}</View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 12 }]}>Actions</Text>
        {renderNavigationCard('Create New Order', 'Log patient, doctor details & prescription.', '/call-receiver/create', 'plus.square.fill.on.square.fill')}
        {renderNavigationCard('My Order History', 'Review status of orders created by you.', '/call-receiver/orders', 'clock.arrow.circlepath')}
      </View>
    );
  };

  const renderBillerDashboard = () => {
    const stats = MOCK_DASHBOARD_STATS.biller;
    return (
      <View style={styles.dashboardContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Billing Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.gridHalf}>{renderStatCard('Pending Bills', stats.pendingBillingCount, 'creditcard.fill', '#D97706')}</View>
          <View style={styles.gridHalf}>{renderStatCard('Completed Today', stats.completedBillingCount, 'checkmark.shield.fill', '#10B981')}</View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 12 }]}>Actions</Text>
        {renderNavigationCard('Billing Queue', 'Verify prescriptions, calculate and mark billed.', '/biller/queue', 'doc.plaintext.fill')}
      </View>
    );
  };

  const renderPackerDashboard = () => {
    const stats = MOCK_DASHBOARD_STATS.packer;
    return (
      <View style={styles.dashboardContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Packing Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.gridHalf}>{renderStatCard('Pending Pack', stats.pendingPackingCount, 'shippingbox.fill', '#7C3AED')}</View>
          <View style={styles.gridHalf}>{renderStatCard('Packed Today', stats.completedPackingCount, 'checkmark.seal.fill', '#10B981')}</View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 12 }]}>Actions</Text>
        {renderNavigationCard('Packing Queue', 'Confirm item details and bundle prescriptions.', '/packer/queue', 'shippingbox.and.arrow.backward.fill')}
      </View>
    );
  };

  const renderDeliveryTeamDashboard = () => {
    const stats = MOCK_DASHBOARD_STATS.deliveryTeam;
    return (
      <View style={styles.dashboardContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Dispatch Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.gridHalf}>{renderStatCard('Ready for Delivery', stats.readyForDeliveryCount, 'shippingbox.fill', '#0284C7')}</View>
          <View style={styles.gridHalf}>{renderStatCard('Assigned Riders', stats.assignedDeliveriesCount, 'bicycle', '#2563EB')}</View>
        </View>
        {renderStatCard('Available Riders', stats.availableDriversCount, 'person.2.fill', '#10B981')}

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 12 }]}>Actions</Text>
        {renderNavigationCard('Dispatch Center', 'Assign available riders to pending items.', '/delivery-team/dispatch', 'map.fill')}
      </View>
    );
  };

  const renderDeliveryBoyDashboard = () => {
    const stats = MOCK_DASHBOARD_STATS.deliveryBoy;
    return (
      <View style={styles.dashboardContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Delivery Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.gridHalf}>{renderStatCard('Assigned Task', stats.assignedCount, 'bell.badge.fill', '#D97706')}</View>
          <View style={styles.gridHalf}>{renderStatCard('Delivered Today', stats.deliveredCount, 'checkmark.circle.fill', '#10B981')}</View>
        </View>
        {renderStatCard('Undelivered / Issues', stats.undeliveredCount, 'exclamationmark.triangle.fill', '#EF4444')}

        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 12 }]}>Actions</Text>
        {renderNavigationCard('My Active Deliveries', 'View client addresses and update payment states.', '/delivery-boy/deliveries', 'house.fill')}
      </View>
    );
  };

  const renderDashboardContent = () => {
    switch (role) {
      case 'ADMIN':
        return renderAdminDashboard();
      case 'CALL_RECEIVER':
        return renderCallReceiverDashboard();
      case 'BILLER':
        return renderBillerDashboard();
      case 'PACKER':
        return renderPackerDashboard();
      case 'DELIVERY_TEAM':
        return renderDeliveryTeamDashboard();
      case 'DELIVERY_BOY':
        return renderDeliveryBoyDashboard();
      default:
        return (
          <View style={styles.errorState}>
            <Text style={{ color: theme.text }}>Invalid Role Configuration</Text>
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {renderHeader()}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderDashboardContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  safeHeader: {
    paddingTop: Platform.OS === 'android' ? 12 : 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerWelcome: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  headerName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
  },
  dashboardContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  gridHalf: {
    width: '50%',
    paddingHorizontal: 8,
  },
  statCard: {
    padding: 16,
    marginBottom: 16,
  },
  statCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  statIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navCardPressable: {
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  navCard: {
    padding: 16,
    marginBottom: 0,
  },
  navCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTextContainer: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  navDesc: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.85,
  },
  errorState: {
    padding: 32,
    alignItems: 'center',
  },
});
