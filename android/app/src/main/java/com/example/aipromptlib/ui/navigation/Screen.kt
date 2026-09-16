package com.example.aipromptlib.ui.navigation

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Explore : Screen("explore")
    object Saved : Screen("saved")
    object Category : Screen("category/{categoryId}") {
        fun createRoute(categoryId: String) = "category/$categoryId"
    }
    object PromptDetail : Screen("prompt_detail/{promptId}") {
        fun createRoute(promptId: String) = "prompt_detail/$promptId"
    }
}
