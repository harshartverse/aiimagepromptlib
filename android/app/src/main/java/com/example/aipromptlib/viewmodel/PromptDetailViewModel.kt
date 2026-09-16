package com.example.aipromptlib.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.aipromptlib.data.model.Prompt
import com.example.aipromptlib.data.repository.PromptRepository
import com.example.aipromptlib.data.repository.RepositoryProvider
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class PromptDetailViewModel(
    private val repository: PromptRepository = RepositoryProvider.instance
) : ViewModel() {

    private val _prompt = MutableStateFlow<Prompt?>(null)
    val prompt: StateFlow<Prompt?> = _prompt.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isNotFound = MutableStateFlow(false)
    val isNotFound: StateFlow<Boolean> = _isNotFound.asStateFlow()

    val savedPromptIds: StateFlow<Set<String>> = repository.savedPromptIds
        .stateIn(viewModelScope, SharingStarted.Lazily, emptySet())

    fun loadPrompt(id: String) {
        viewModelScope.launch {
            _isLoading.value = true
            val result = repository.getPromptById(id)
            if (result != null) {
                _prompt.value = result
                _isNotFound.value = false
            } else {
                _isNotFound.value = true
            }
            _isLoading.value = false
        }
    }

    fun toggleSave(id: String) {
        repository.toggleSave(id)
    }
}
