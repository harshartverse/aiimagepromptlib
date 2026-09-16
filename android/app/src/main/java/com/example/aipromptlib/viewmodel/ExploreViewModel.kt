package com.example.aipromptlib.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.aipromptlib.data.model.Prompt
import com.example.aipromptlib.data.repository.PromptRepository
import com.example.aipromptlib.data.repository.RepositoryProvider
import kotlinx.coroutines.flow.*

class ExploreViewModel(
    private val repository: PromptRepository = RepositoryProvider.instance
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedCategoryName = MutableStateFlow("All")
    val selectedCategoryName: StateFlow<String> = _selectedCategoryName.asStateFlow()

    val categories = repository.getCategories()
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    val savedPromptIds: StateFlow<Set<String>> = repository.savedPromptIds
        .stateIn(viewModelScope, SharingStarted.Lazily, emptySet())

    private val allPrompts = repository.getAllPrompts()

    val filteredPrompts: StateFlow<List<Prompt>> = combine(
        allPrompts, _searchQuery, _selectedCategoryName
    ) { prompts, query, categoryName ->
        prompts.filter { prompt ->
            val matchesCategory = categoryName == "All" || prompt.category.equals(categoryName, ignoreCase = true)
            
            val matchesQuery = query.isBlank() || 
                prompt.title.contains(query, ignoreCase = true) ||
                prompt.promptText.contains(query, ignoreCase = true) ||
                prompt.category.contains(query, ignoreCase = true) ||
                prompt.tags.any { it.contains(query, ignoreCase = true) }
            
            matchesCategory && matchesQuery
        }
    }.stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun onCategorySelected(categoryName: String) {
        _selectedCategoryName.value = categoryName
    }

    fun clearSearch() {
        _searchQuery.value = ""
    }

    fun toggleSave(promptId: String) {
        repository.toggleSave(promptId)
    }
}
