import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../tokens';

type ToastTone = 'neutral' | 'success' | 'error';
interface ToastApi {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_BG: Record<ToastTone, string> = {
  neutral: colors.neutral[900],
  success: colors.brand[600],
  error: colors.semantic.error,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<{ message: string; tone: ToastTone } | null>(null);

  const toast = useCallback((message: string, tone: ToastTone = 'neutral') => {
    setCurrent({ message, tone });
    setTimeout(() => setCurrent(null), 4000);
  }, []);

  const value = useMemo<ToastApi>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {current ? (
        <View style={styles.wrap} pointerEvents="none">
          <View style={[styles.toast, { backgroundColor: TONE_BG[current.tone] }]}>
            <Text style={styles.text}>{current.message}</Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: spacing[6], alignItems: 'center' },
  toast: { borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  text: { color: colors.neutral[0], fontSize: typography.fontSize.sm, fontWeight: '500' },
});
