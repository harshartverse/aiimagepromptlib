package com.example.aipromptlib.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.aipromptlib.data.model.Category
import com.example.aipromptlib.data.model.Prompt
import com.example.aipromptlib.data.repository.PromptRepository
import com.example.aipromptlib.data.repository.RepositoryProvider
import com.example.aipromptlib.utils.UiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class HomeViewModel(
    private val repository: PromptRepository = RepositoryProvider.instance
) : ViewModel() {

    private val _uiState = MutableStateFlow<UiState<Unit>>(UiState.Loading)
    val uiState: StateFlow<UiState<Unit>> = _uiState.asStateFlow()

    val trendingPrompts: StateFlow<List<Prompt>> = repository.getTrendingPrompts()
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    val newPrompts: StateFlow<List<Prompt>> = repository.getNewPrompts()
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    val categories: StateFlow<List<Category>> = repository.getCategories()
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    val savedPromptIds: StateFlow<Set<String>> = repository.savedPromptIds
        .stateIn(viewModelScope, SharingStarted.Lazily, emptySet())

    init {
        fetchData()
    }

    fun fetchData() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            try {
                repository.refresh()
                _uiState.value = UiState.Success(Unit)
            } catch (e: Exception) {
                // Keep success if we already have cache
                if (categories.value.isNotEmpty() || trendingPrompts.value.isNotEmpty()) {
                    _uiState.value = UiState.Success(Unit)
                } else {
                    _uiState.value = UiState.Error("Unable to load prompts. Please check your connection and try again.")
                }
            }
        }
    }

    fun toggleSave(promptId: String) {
        repository.toggleSave(promptId)
    }
}
