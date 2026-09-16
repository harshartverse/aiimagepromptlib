package com.example.aipromptlib.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.navigation.NavController
import com.example.aipromptlib.ui.navigation.Screen

@Composable
fun BottomNavBar(navController: NavController, currentRoute: String?) {
    NavigationBar {
        NavigationBarItem(
            icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
            label = { Text("Home") },
            selected = currentRoute == Screen.Home.route,
            onClick = {
                if (currentRoute != Screen.Home.route) {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Home.route) { inclusive = false }
                        launchSingleTop = true
                    }
                }
            }
        )
        NavigationBarItem(
            icon = { Icon(Icons.Default.Search, contentDescription = "Explore") },
            label = { Text("Explore") },
            selected = currentRoute == Screen.Explore.route,
            onClick = {
                if (currentRoute != Screen.Explore.route) {
                    navController.navigate(Screen.Explore.route) {
                        popUpTo(Screen.Home.route)
                        launchSingleTop = true
                    }
                }
            }
        )
        NavigationBarItem(
            icon = { Icon(Icons.Default.Favorite, contentDescription = "Saved") },
            label = { Text("Saved") },
            selected = currentRoute == Screen.Saved.route,
            onClick = {
                if (currentRoute != Screen.Saved.route) {
                    navController.navigate(Screen.Saved.route) {
                        popUpTo(Screen.Home.route)
                        launchSingleTop = true
                    }
                }
            }
        )
    }
}
