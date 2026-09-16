package com.example.aipromptlib.ui.screens.saved

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.example.aipromptlib.ui.components.PromptCard
import com.example.aipromptlib.ui.navigation.Screen
import com.example.aipromptlib.viewmodel.SavedViewModel

@Composable
fun SavedScreen(
    navController: NavController,
    viewModel: SavedViewModel = viewModel()
) {
    val savedPrompts by viewModel.savedPrompts.collectAsState()
    val savedIds by viewModel.savedPromptIds.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Top Header
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Saved",
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = "Your saved prompts",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            )
        }

        if (savedPrompts.isEmpty()) {
            com.example.aipromptlib.ui.components.EmptyState(
                title = "No saved prompts yet",
                description = "Save prompts you love and they'll appear here.",
                actionText = "Explore Prompts",
                onActionClick = {
                    navController.navigate(Screen.Explore.route) {
                        popUpTo(Screen.Home.route)
                        launchSingleTop = true
                    }
                }
            )
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 160.dp),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(savedPrompts, key = { it.id }) { prompt ->
                    PromptCard(
                        prompt = prompt,
                        isSaved = savedIds.contains(prompt.id),
                        onSaveClick = { viewModel.toggleSave(it) },
                        onClick = { navController.navigate(Screen.PromptDetail.createRoute(it)) }
                    )
                }
            }
        }
    }
}
