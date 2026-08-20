import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const theme = useTheme();
  
  // Custom colors for medical theme, but falling back or respecting background when needed
  const getColors = () => {
    switch (variant) {
      case 'secondary':
        return {
          bg: theme.backgroundElement,
          text: theme.text,
          border: 'transparent',
        };
      case 'danger':
        return {
          bg: '#EF4444',
          text: '#FFFFFF',
          border: 'transparent',
        };
      case 'success':
        return {
          bg: '#10B981',
          text: '#FFFFFF',
          border: 'transparent',
        };
      case 'primary':
      default:
        return {
          bg: '#0F766E', // Teal medical color
          text: '#FFFFFF',
          border: 'transparent',
        };
    }
  };

  const { bg, text } = getColors();

  const sizeStyle = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 };
      case 'large':
        return { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12 };
      case 'medium':
      default:
        return { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 };
    }
  };

  const textFontSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      case 'medium':
      default:
        return 16;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        sizeStyle(),
        { backgroundColor: bg },
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={text} size="small" />
      ) : (
        <Text style={[styles.text, { color: text, fontSize: textFontSize() }, textStyle]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        cursor: 'pointer',
      },
    }),
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
