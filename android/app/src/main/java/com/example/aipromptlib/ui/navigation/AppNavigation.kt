package com.example.aipromptlib.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.aipromptlib.ui.components.BottomNavBar
import com.example.aipromptlib.ui.screens.home.HomeScreen
import com.example.aipromptlib.ui.screens.explore.ExploreScreen
import com.example.aipromptlib.ui.screens.saved.SavedScreen
import com.example.aipromptlib.ui.screens.category.CategoryScreen
import com.example.aipromptlib.ui.screens.promptdetail.PromptDetailScreen

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val backStackEntry = navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry.value?.destination?.route

    val showBottomNav = currentRoute in listOf(
        Screen.Home.route,
        Screen.Explore.route,
        Screen.Saved.route
    )

    Scaffold(
        bottomBar = {
            if (showBottomNav) {
                BottomNavBar(navController = navController, currentRoute = currentRoute)
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Home.route) { HomeScreen(navController) }
            composable(Screen.Explore.route) { ExploreScreen(navController) }
            composable(Screen.Saved.route) { SavedScreen(navController) }
            composable(Screen.Category.route) { backStackEntry ->
                val categoryId = backStackEntry.arguments?.getString("categoryId") ?: ""
                CategoryScreen(navController, categoryId)
            }
            composable(Screen.PromptDetail.route) { backStackEntry ->
                val promptId = backStackEntry.arguments?.getString("promptId") ?: ""
                PromptDetailScreen(navController, promptId)
            }
        }
    }
}
