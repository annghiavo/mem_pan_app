import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert that works on both native and web.
 * On web, Alert.alert is a no-op, so we use window.alert/confirm instead.
 */
export function showAlert(title: string, message?: string, onOk?: () => void) {
    if (Platform.OS === 'web') {
        window.alert(message ? `${title}\n${message}` : title);
        onOk?.();
    } else {
        Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
    }
}

/**
 * Cross-platform confirm dialog.
 * On web, uses window.confirm. On native, uses Alert.alert with two buttons.
 */
export function showConfirm(
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText: string = 'OK',
    cancelText: string = 'Hủy'
) {
    if (Platform.OS === 'web') {
        if (window.confirm(`${title}\n${message}`)) {
            onConfirm();
        }
    } else {
        Alert.alert(title, message, [
            { text: cancelText, style: 'cancel' },
            { text: confirmText, onPress: onConfirm, style: 'destructive' },
        ]);
    }
}
