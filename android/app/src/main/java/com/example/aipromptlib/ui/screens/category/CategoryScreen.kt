package com.example.aipromptlib.ui.screens.category

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.example.aipromptlib.ui.components.PromptCard
import com.example.aipromptlib.ui.navigation.Screen
import com.example.aipromptlib.viewmodel.CategoryViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoryScreen(
    navController: NavController,
    categoryId: String,
    viewModel: CategoryViewModel = viewModel()
) {
    val category by viewModel.category.collectAsState()
    val prompts by viewModel.prompts.collectAsState()
    val isNotFound by viewModel.isNotFound.collectAsState()
    val savedIds by viewModel.savedPromptIds.collectAsState()

    LaunchedEffect(categoryId) {
        viewModel.loadCategory(categoryId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(text = category?.name ?: if (isNotFound) "Not Found" else "") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground,
                    navigationIconContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
        ) {
            if (isNotFound) {
                com.example.aipromptlib.ui.components.EmptyState(
                    title = "Category not found",
                    description = "The requested category does not exist or is unavailable.",
                    actionText = "Go Back",
                    onActionClick = { navController.popBackStack() }
                )
            } else if (category != null) {
                Column(modifier = Modifier.fillMaxSize()) {
                    category?.description?.let { desc ->
                        Text(
                            text = desc,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                        )
                    }
                    
                    if (prompts.isEmpty()) {
                        com.example.aipromptlib.ui.components.EmptyState(
                            title = "No prompts yet",
                            description = "No prompts in this category yet.",
                            modifier = Modifier.weight(1f)
                        )
                    } else {
                        Text(
                            text = "${prompts.size} prompts",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                        )
                        LazyVerticalGrid(
                            columns = GridCells.Adaptive(minSize = 160.dp),
                            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp, top = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp),
                            modifier = Modifier.fillMaxSize()
                        ) {
                            items(prompts) { prompt ->
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
        }
    }
}
