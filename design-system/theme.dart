import 'package:flutter/material.dart';

/// PrintCost App Theme Configuration
/// Consistently maps colors and styles from the centralized design system.
class PrintCostTheme {
  // Brand Colors
  static const Color colorBg = Color(0xFF0F172A);
  static const Color colorSurface = Color(0xFF1E293B);
  static const Color colorPrimary = Color(0xFF3B82F6);
  static const Color colorCta = Color(0xFF2563EB);
  static const Color colorAccent = Color(0xFF60A5FA);
  static const Color colorText = Color(0xFFF1F5F9);
  static const Color colorTextMuted = Color(0xFF94A3B8);
  static const Color colorBorder = Color(0xFF334155);

  // Status Colors
  static const Color colorSuccess = Color(0xFF10B981);
  static const Color colorDanger = Color(0xFFEF4444);
  static const Color colorWarning = Color(0xFFF59E0B);

  /// Dark Color Scheme for Material 3
  static final ColorScheme darkColorScheme = ColorScheme.dark(
    brightness: Brightness.dark,
    background: colorBg,
    surface: colorSurface,
    primary: colorPrimary,
    onPrimary: colorText,
    secondary: colorAccent,
    onSecondary: colorBg,
    error: colorDanger,
    onError: colorText,
    outline: colorBorder,
  );

  /// Typography Configuration
  /// Heading elements use a monospaced font family for numerical alignment and precision dashboard look.
  /// Body elements use sans-serif fonts.
  static final TextTheme textTheme = TextTheme(
    displayLarge: TextStyle(
      fontFamily: 'JetBrainsMono',
      fontWeight: FontWeight.bold,
      fontSize: 36.0,
      color: colorText,
    ),
    displayMedium: TextStyle(
      fontFamily: 'JetBrainsMono',
      fontWeight: FontWeight.bold,
      fontSize: 30.0,
      color: colorText,
    ),
    displaySmall: TextStyle(
      fontFamily: 'JetBrainsMono',
      fontWeight: FontWeight.bold,
      fontSize: 24.0,
      color: colorText,
    ),
    headlineLarge: TextStyle(
      fontFamily: 'JetBrainsMono',
      fontWeight: FontWeight.w600,
      fontSize: 20.0,
      color: colorText,
    ),
    headlineMedium: TextStyle(
      fontFamily: 'JetBrainsMono',
      fontWeight: FontWeight.w600,
      fontSize: 18.0,
      color: colorText,
    ),
    titleLarge: TextStyle(
      fontFamily: 'IBMPlexSans',
      fontWeight: FontWeight.w600,
      fontSize: 16.0,
      color: colorText,
    ),
    bodyLarge: TextStyle(
      fontFamily: 'IBMPlexSans',
      fontWeight: FontWeight.normal,
      fontSize: 16.0,
      color: colorText,
    ),
    bodyMedium: TextStyle(
      fontFamily: 'IBMPlexSans',
      fontWeight: FontWeight.normal,
      fontSize: 14.0,
      color: colorTextMuted,
    ),
    labelLarge: TextStyle(
      fontFamily: 'IBMPlexSans',
      fontWeight: FontWeight.w500,
      fontSize: 14.0,
      color: colorText,
    ),
  );

  /// Main Theme Data
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: darkColorScheme,
      scaffoldBackgroundColor: colorBg,
      textTheme: textTheme,
      
      // Card Theme
      cardTheme: CardTheme(
        color: colorSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12.0),
          side: const BorderSide(color: colorBorder, width: 1.0),
        ),
      ),

      // Input Decoration Theme
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colorSurface,
        labelStyle: const TextStyle(color: colorTextMuted),
        hintStyle: const TextStyle(color: colorTextMuted),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8.0),
          borderSide: const BorderSide(color: colorBorder, width: 1.0),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8.0),
          borderSide: const BorderSide(color: colorBorder, width: 1.0),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8.0),
          borderSide: const BorderSide(color: colorPrimary, width: 2.0),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8.0),
          borderSide: const BorderSide(color: colorDanger, width: 1.0),
        ),
      ),

      // Button Theme
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colorCta,
          foregroundColor: colorText,
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8.0),
          ),
          textStyle: const TextStyle(
            fontFamily: 'IBMPlexSans',
            fontWeight: FontWeight.w600,
            fontSize: 16.0,
          ),
        ),
      ),
    );
  }
}
