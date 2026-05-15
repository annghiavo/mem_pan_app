import React from 'react';
import { Platform, View, StyleProp, ViewStyle } from 'react-native';

interface WebContainerProps {
    children: React.ReactNode;
    maxWidth?: number;
    paddingHorizontal?: number;
    style?: StyleProp<ViewStyle>;
}

export function WebContainer({
    children,
    maxWidth = 1100,
    paddingHorizontal = 24,
    style,
}: WebContainerProps) {
    if (Platform.OS !== 'web') {
        return <>{children}</>;
    }
    return (
        <View
            style={[
                {
                    width: '100%',
                    maxWidth,
                    paddingHorizontal,
                    // @ts-ignore - web-only
                    marginHorizontal: 'auto',
                    alignSelf: 'center',
                },
                style,
            ]}
        >
            {children}
        </View>
    );
}
