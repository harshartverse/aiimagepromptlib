package com.example.aipromptlib.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.example.aipromptlib.data.model.Prompt
import com.example.aipromptlib.ui.components.CategoryChip
import com.example.aipromptlib.ui.components.PromptCard
import com.example.aipromptlib.ui.navigation.Screen
import com.example.aipromptlib.utils.UiState
import com.example.aipromptlib.viewmodel.HomeViewModel

@Composable
fun HomeScreen(
    navController: NavController,
    viewModel: HomeViewModel = viewModel()
) {
    val trendingPrompts by viewModel.trendingPrompts.collectAsState()
    val newPrompts by viewModel.newPrompts.collectAsState()
    val categories by viewModel.categories.collectAsState()
    val savedIds by viewModel.savedPromptIds.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Top Header
        Text(
            text = "AI Prompt Library",
            style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp)
        )
        
        Spacer(modifier = Modifier.height(16.dp))

        // Search Bar (Navigates to Explore)
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .clickable { navController.navigate(Screen.Explore.route) }
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(12.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search",
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Search AI prompts...",
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    style = MaterialTheme.typography.bodyLarge
                )
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))

        when (uiState) {
            is UiState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            is UiState.Error -> {
                Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = (uiState as UiState.Error).message, 
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodyLarge
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.fetchData() }) {
                            Text("Retry")
                        }
                    }
                }
            }
            is UiState.Success -> {
                Column(modifier = Modifier.verticalScroll(scrollState).padding(bottom = 16.dp)) {
                    // Categories
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp)
                    ) {
                        items(categories) { category ->
                            CategoryChip(
                                category = category,
                                onClick = { navController.navigate(Screen.Category.createRoute(it)) }
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(32.dp))

                    // Trending Section
                    if (trendingPrompts.isNotEmpty()) {
                        SectionHeader("Trending")
                        Spacer(modifier = Modifier.height(16.dp))
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp)
                        ) {
                            items(trendingPrompts) { prompt ->
                                PromptCard(
                                    prompt = prompt,
                                    isSaved = savedIds.contains(prompt.id),
                                    onSaveClick = { viewModel.toggleSave(it) },
                                    onClick = { navController.navigate(Screen.PromptDetail.createRoute(it)) },
                                    modifier = Modifier.width(280.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(32.dp))
                    }

                    // New Section
                    if (newPrompts.isNotEmpty()) {
                        SectionHeader("New")
                        Spacer(modifier = Modifier.height(16.dp))
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp)
                        ) {
                            items(newPrompts) { prompt ->
                                PromptCard(
                                    prompt = prompt,
                                    isSaved = savedIds.contains(prompt.id),
                                    onSaveClick = { viewModel.toggleSave(it) },
                                    onClick = { navController.navigate(Screen.PromptDetail.createRoute(it)) },
                                    modifier = Modifier.width(280.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(32.dp))
                    }

                    // Featured Section
                    if (trendingPrompts.isNotEmpty()) {
                        SectionHeader("Featured")
                        Spacer(modifier = Modifier.height(16.dp))
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp)
                        ) {
                            items(trendingPrompts.shuffled().take(2)) { prompt ->
                                PromptCard(
                                    prompt = prompt,
                                    isSaved = savedIds.contains(prompt.id),
                                    onSaveClick = { viewModel.toggleSave(it) },
                                    onClick = { navController.navigate(Screen.PromptDetail.createRoute(it)) },
                                    modifier = Modifier.width(280.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(24.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun SectionHeader(title: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onBackground
        )
        Text(
            text = "See All",
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.clickable { /* Handle See All */ }
        )
    }
}
