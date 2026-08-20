import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { router, Redirect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAuth, MOCK_USERS } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { TextInput } from '@/components/ui/text-input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserRole } from '@/constants/types';

export default function LoginScreen() {
  const { state, login, clearError } = useAuth();
  const theme = useTheme();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<{ username?: string; password?: string }>({});

  if (state.isAuthenticated) {
    return <Redirect href="/dashboard" />;
  }

  const validate = () => {
    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) {
      errors.username = 'Username or email is required';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 4) {
      errors.password = 'Password must be at least 4 characters';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    
    const success = await login(username, password);
    if (success) {
      router.replace('/dashboard');
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    const key = Object.keys(MOCK_USERS).find((k) => MOCK_USERS[k].role === role);
    if (key) {
      setUsername(key);
      setPassword(key); // Set password to username for seeded dev account authentication
      const success = await login(key, key, role);
      if (success) {
        router.replace('/dashboard');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Header Branding */}
        <View style={styles.brandContainer}>
          <View style={[styles.logoOutline, { borderColor: '#0D9488' }]}>
            <SymbolView
              name="cross.case.fill"
              size={48}
              tintColor="#0D9488"
              fallback={
                <View style={styles.fallbackLogo}>
                  <Text style={styles.fallbackLogoText}>✚</Text>
                </View>
              }
            />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>Pharmacy Management</Text>
          <Text style={[styles.appSubtitle, { color: theme.textSecondary }]}>
            Production-Ready Android Suite
          </Text>
        </View>

        {/* Login Form */}
        <Card style={styles.card}>
          <Text style={[styles.loginTitle, { color: theme.text }]}>Sign In</Text>

          {state.error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{state.error}</Text>
            </View>
          )}

          <TextInput
            label="Username / Email"
            placeholder="e.g. admin, receiver, biller"
            value={username}
            onChangeText={(val) => {
              setUsername(val);
              clearError();
              if (validationErrors.username) {
                setValidationErrors((prev) => ({ ...prev, username: undefined }));
              }
            }}
            error={validationErrors.username}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (validationErrors.password) {
                setValidationErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            error={validationErrors.password}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Button
            title="Log In"
            onPress={handleLogin}
            loading={state.isLoading}
            style={styles.loginButton}
          />
        </Card>

        {/* Quick Testing Panel */}
        <Card style={[styles.card, styles.quickLoginCard]}>
          <Text style={[styles.quickTitle, { color: theme.text }]}>
            Developer Testing Panel
          </Text>
          <Text style={[styles.quickDesc, { color: theme.textSecondary }]}>
            Select a role to instantly authenticate and test workflows:
          </Text>

          <View style={styles.grid}>
            {(Object.keys(MOCK_USERS) as (keyof typeof MOCK_USERS)[]).map((key) => {
              const mock = MOCK_USERS[key];
              return (
                <Pressable
                  key={key}
                  onPress={() => handleQuickLogin(mock.role)}
                  disabled={state.isLoading}
                  style={({ pressed }) => [
                    styles.gridItem,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.backgroundSelected,
                    },
                    pressed && styles.gridItemPressed,
                  ]}
                >
                  <Text style={[styles.gridText, { color: theme.text }]}>
                    {mock.role.replace('_', ' ')}
                  </Text>
                  <Text style={[styles.gridSubtext, { color: theme.textSecondary }]}>
                    {key}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: Platform.OS === 'android' ? 40 : 0,
  },
  logoOutline: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F0FDFA',
  },
  fallbackLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackLogoText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  card: {
    padding: 24,
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  loginButton: {
    marginTop: 8,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '500',
  },
  quickLoginCard: {
    padding: 16,
  },
  quickTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  quickDesc: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: {
    width: '50%',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    // We add margin inside box using style trick or wrapping
  },
  gridItemPressed: {
    opacity: 0.7,
  },
  gridText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gridSubtext: {
    fontSize: 11,
    marginTop: 2,
    textTransform: 'lowercase',
  },
});
