import { StyleSheet, Platform } from 'react-native';
import { colors } from './colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const globalStyles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenPadding: {
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Cards
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
    ...shadows.md,
  },
  cardElevated: {
    backgroundColor: colors.cardElevated,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    ...shadows.lg,
  },

  // Typography
  heading: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 28,
    color: colors.text,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 16,
    color: colors.textSecondary,
  },
  body: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },

  // Inputs
  input: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },

  // Buttons
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  buttonText: {
    fontFamily: 'DonegalOne_400Regular',
    color: colors.textWhite,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonOutlineText: {
    fontFamily: 'DonegalOne_400Regular',
    color: colors.primary,
    fontSize: 16,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },

  // Badge
  badge: {
    backgroundColor: colors.primaryFaded,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
});
