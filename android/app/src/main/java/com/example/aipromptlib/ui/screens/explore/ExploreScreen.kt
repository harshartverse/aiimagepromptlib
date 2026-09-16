package com.example.aipromptlib.ui.screens.explore

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
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
import com.example.aipromptlib.data.model.Category
import com.example.aipromptlib.ui.components.CategoryChip
import com.example.aipromptlib.ui.components.PromptCard
import com.example.aipromptlib.ui.navigation.Screen
import com.example.aipromptlib.viewmodel.ExploreViewModel

@Composable
fun ExploreScreen(
    navController: NavController,
    viewModel: ExploreViewModel = viewModel()
) {
    val searchQuery by viewModel.searchQuery.collectAsState()
    val selectedCategoryName by viewModel.selectedCategoryName.collectAsState()
    val categories by viewModel.categories.collectAsState()
    val filteredPrompts by viewModel.filteredPrompts.collectAsState()
    val savedIds by viewModel.savedPromptIds.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Top Header
        Text(
            text = "Explore",
            style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 12.dp)
        )

        // Search Bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = viewModel::onSearchQueryChange,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            placeholder = { Text("Search AI prompts...") },
            leadingIcon = {
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search",
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = viewModel::clearSearch) {
                        Icon(
                            imageVector = Icons.Default.Clear,
                            contentDescription = "Clear search",
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
            },
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.surface,
                focusedContainerColor = MaterialTheme.colorScheme.surface,
                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                focusedTextColor = MaterialTheme.colorScheme.onSurface,
                unfocusedTextColor = MaterialTheme.colorScheme.onSurface
            ),
            singleLine = true
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Categories
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 16.dp)
        ) {
            item {
                CategoryChip(
                    category = Category("all", "All", null, null, 0L),
                    isSelected = selectedCategoryName == "All",
                    onClick = { viewModel.onCategorySelected("All") }
                )
            }
            items(categories) { category ->
                CategoryChip(
                    category = category,
                    isSelected = selectedCategoryName == category.name,
                    onClick = { viewModel.onCategorySelected(category.name) }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Results Grid
        if (filteredPrompts.isEmpty()) {
            com.example.aipromptlib.ui.components.EmptyState(
                title = "No prompts found",
                description = "Try a different keyword or category."
            )
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 160.dp),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(filteredPrompts) { prompt ->
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
