import React from 'react';
import { StyleSheet, View, ViewProps, Platform } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  bordered?: boolean;
}

export function Card({ children, style, bordered = false, ...rest }: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: bordered ? theme.backgroundSelected : 'transparent',
          borderWidth: bordered ? 1 : 0,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignSelf: 'stretch',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
});
