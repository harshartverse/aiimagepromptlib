package com.example.aipromptlib.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val DarkBackground = Color(0xFF121212)
val SurfaceDark = Color(0xFF1E1E1E)
val PrimaryAccent = Color(0xFF6BB8FF)
val TextPrimary = Color(0xFFF5F5F5)
val TextSecondary = Color(0xFFA0A0A0)

private val DarkColorScheme = darkColorScheme(
    background = DarkBackground,
    surface = SurfaceDark,
    primary = PrimaryAccent,
    onBackground = TextPrimary,
    onSurface = TextPrimary
)

val AppTypography = Typography(
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.5.sp
    )
)

@Composable
fun AIPromptLibraryTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = AppTypography,
        content = content
    )
}
