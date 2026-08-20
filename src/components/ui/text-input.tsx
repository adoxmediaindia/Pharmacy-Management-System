import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  View,
  Pressable,
  Platform,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string | null;
  secureTextEntry?: boolean;
}

export function TextInput({
  label,
  error,
  secureTextEntry = false,
  style,
  ...rest
}: TextInputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  const isSecure = secureTextEntry && !isPasswordVisible;

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: error
              ? '#EF4444'
              : isFocused
              ? '#0F766E'
              : 'transparent',
          },
        ]}
      >
        <RNTextInput
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isSecure}
          placeholderTextColor={theme.textSecondary + '80'}
          style={[
            styles.input,
            {
              color: theme.text,
            },
            style,
          ]}
          {...rest}
        />
        {secureTextEntry && (
          <Pressable onPress={togglePasswordVisibility} style={styles.iconContainer}>
            <SymbolView
              name={isPasswordVisible ? 'eye.slash' : 'eye'}
              size={20}
              tintColor={theme.textSecondary}
              fallback={
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {isPasswordVisible ? 'Hide' : 'Show'}
                </Text>
              }
            />
          </Pressable>
        )}
      </View>
      {error && (
        <Text style={[styles.errorText, { color: '#EF4444' }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        paddingVertical: 12,
      },
      android: {
        paddingVertical: 4,
      },
      web: {
        paddingVertical: 8,
      },
    }),
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  iconContainer: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
