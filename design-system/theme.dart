import 'package:flutter/material.dart';

/// PrintCost App Theme Configuration
/// Mirrors the centralized design system (design-system/variables.css).
/// Both light and dark themes are defined here to maintain parity with
/// the web CSS variables.
///
/// Usage in MaterialApp:
///   MaterialApp(
///     theme: PrintCostTheme.lightTheme,
///     darkTheme: PrintCostTheme.darkTheme,
///     themeMode: ThemeMode.system, // or ThemeMode.light / ThemeMode.dark
///   )
class PrintCostTheme {
  // ===========================================================================
  // DARK MODE COLORS  (mirrors .dark in variables.css)
  // ===========================================================================
  static const Color darkBg         = Color(0xFF0F172A); // slate-900
  static const Color darkSurface    = Color(0xFF1E293B); // slate-800
  static const Color darkSurface2   = Color(0xFF0F172A); // slate-900 (nested)
  static const Color darkPrimary    = Color(0xFF3B82F6); // blue-500
  static const Color darkCta        = Color(0xFF2563EB); // blue-600
  static const Color darkAccent     = Color(0xFF60A5FA); // blue-400
  static const Color darkText       = Color(0xFFF1F5F9); // slate-100
  static const Color darkTextMuted  = Color(0xFF94A3B8); // slate-400
  static const Color darkBorder     = Color(0xFF334155); // slate-700
  static const Color darkSuccess    = Color(0xFF10B981); // emerald-500
  static const Color darkDanger     = Color(0xFFEF4444); // red-500
  static const Color darkWarning    = Color(0xFFF59E0B); // amber-500

  // ===========================================================================
  // LIGHT MODE COLORS  (mirrors :root / .light in variables.css)
  // ===========================================================================
  static const Color lightBg        = Color(0xFFF8FAFC); // slate-50
  static const Color lightSurface   = Color(0xFFFFFFFF); // white
  static const Color lightSurface2  = Color(0xFFF1F5F9); // slate-100
  static const Color lightPrimary   = Color(0xFF2563EB); // blue-600
  static const Color lightCta       = Color(0xFF1D4ED8); // blue-700
  static const Color lightAccent    = Color(0xFF3B82F6); // blue-500
  static const Color lightText      = Color(0xFF0F172A); // slate-900
  static const Color lightTextMuted = Color(0xFF475569); // slate-600
  static const Color lightBorder    = Color(0xFFCBD5E1); // slate-300
  static const Color lightSuccess   = Color(0xFF059669); // emerald-600
  static const Color lightDanger    = Color(0xFFDC2626); // red-600
  static const Color lightWarning   = Color(0xFFD97706); // amber-600

  // ===========================================================================
  // SHARED TYPOGRAPHY
  // Monospaced (JetBrains Mono) for numbers/headings,
  // IBM Plex Sans for body text.
  // ===========================================================================
  static TextTheme _buildTextTheme({required Color textColor, required Color mutedColor}) {
    return TextTheme(
      displayLarge: TextStyle(
        fontFamily: 'JetBrainsMono',
        fontWeight: FontWeight.bold,
        fontSize: 36.0,
        color: textColor,
      ),
      displayMedium: TextStyle(
        fontFamily: 'JetBrainsMono',
        fontWeight: FontWeight.bold,
        fontSize: 30.0,
        color: textColor,
      ),
      displaySmall: TextStyle(
        fontFamily: 'JetBrainsMono',
        fontWeight: FontWeight.bold,
        fontSize: 24.0,
        color: textColor,
      ),
      headlineLarge: TextStyle(
        fontFamily: 'JetBrainsMono',
        fontWeight: FontWeight.w600,
        fontSize: 20.0,
        color: textColor,
      ),
      headlineMedium: TextStyle(
        fontFamily: 'JetBrainsMono',
        fontWeight: FontWeight.w600,
        fontSize: 18.0,
        color: textColor,
      ),
      titleLarge: TextStyle(
        fontFamily: 'IBMPlexSans',
        fontWeight: FontWeight.w600,
        fontSize: 16.0,
        color: textColor,
      ),
      bodyLarge: TextStyle(
        fontFamily: 'IBMPlexSans',
        fontWeight: FontWeight.normal,
        fontSize: 16.0,
        color: textColor,
      ),
      bodyMedium: TextStyle(
        fontFamily: 'IBMPlexSans',
        fontWeight: FontWeight.normal,
        fontSize: 14.0,
        color: mutedColor,
      ),
      labelLarge: TextStyle(
        fontFamily: 'IBMPlexSans',
        fontWeight: FontWeight.w500,
        fontSize: 14.0,
        color: textColor,
      ),
    );
  }

  static ThemeData _buildTheme({
    required Brightness brightness,
    required Color bg,
    required Color surface,
    required Color primary,
    required Color cta,
    required Color textColor,
    required Color mutedColor,
    required Color border,
    required Color danger,
  }) {
    final colorScheme = ColorScheme(
      brightness: brightness,
      primary: primary,
      onPrimary: brightness == Brightness.dark ? const Color(0xFFF1F5F9) : const Color(0xFFFFFFFF),
      secondary: cta,
      onSecondary: brightness == Brightness.dark ? const Color(0xFF0F172A) : const Color(0xFFFFFFFF),
      error: danger,
      onError: brightness == Brightness.dark ? const Color(0xFFF1F5F9) : const Color(0xFFFFFFFF),
      surface: surface,
      onSurface: textColor,
      outline: border,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: bg,
      textTheme: _buildTextTheme(textColor: textColor, mutedColor: mutedColor),

      cardTheme: CardTheme(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12.0),
          side: BorderSide(color: border, width: 1.0),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        labelStyle: TextStyle(color: mutedColor),
        hintStyle: TextStyle(color: mutedColor),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8.0),
          borderSide: BorderSide(color: border, width: 1.0),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8.0),
          borderSide: BorderSide(color: border, width: 1.0),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8.0),
          borderSide: BorderSide(color: primary, width: 2.0),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8.0),
          borderSide: BorderSide(color: danger, width: 1.0),
        ),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: cta,
          foregroundColor: brightness == Brightness.dark
              ? const Color(0xFFF1F5F9)
              : const Color(0xFFFFFFFF),
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

  // ===========================================================================
  // PUBLIC THEME GETTERS
  // ===========================================================================

  /// OLED Industrial Dark Mode – default for xưởng in (workshop environment)
  static ThemeData get darkTheme => _buildTheme(
    brightness: Brightness.dark,
    bg: darkBg,
    surface: darkSurface,
    primary: darkPrimary,
    cta: darkCta,
    textColor: darkText,
    mutedColor: darkTextMuted,
    border: darkBorder,
    danger: darkDanger,
  );

  /// Soft Slate Light Mode – for demo / "flex" / outdoor use
  static ThemeData get lightTheme => _buildTheme(
    brightness: Brightness.light,
    bg: lightBg,
    surface: lightSurface,
    primary: lightPrimary,
    cta: lightCta,
    textColor: lightText,
    mutedColor: lightTextMuted,
    border: lightBorder,
    danger: lightDanger,
  );
}

