package com.example.aipromptlib.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.aipromptlib.data.model.Category
import com.example.aipromptlib.data.model.Prompt
import com.example.aipromptlib.data.repository.PromptRepository
import com.example.aipromptlib.data.repository.RepositoryProvider
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class CategoryViewModel(
    private val repository: PromptRepository = RepositoryProvider.instance
) : ViewModel() {

    private val _category = MutableStateFlow<Category?>(null)
    val category: StateFlow<Category?> = _category.asStateFlow()

    private val _prompts = MutableStateFlow<List<Prompt>>(emptyList())
    val prompts: StateFlow<List<Prompt>> = _prompts.asStateFlow()

    private val _isNotFound = MutableStateFlow(false)
    val isNotFound: StateFlow<Boolean> = _isNotFound.asStateFlow()

    val savedPromptIds: StateFlow<Set<String>> = repository.savedPromptIds
        .stateIn(viewModelScope, SharingStarted.Lazily, emptySet())

    fun loadCategory(categoryId: String) {
        viewModelScope.launch {
            val cat = repository.getCategoryById(categoryId)
            if (cat != null) {
                _category.value = cat
                _isNotFound.value = false
                repository.getPromptsByCategory(cat.name).collect { fetchedPrompts ->
                    _prompts.value = fetchedPrompts
                }
            } else {
                _isNotFound.value = true
            }
        }
    }

    fun toggleSave(promptId: String) {
        repository.toggleSave(promptId)
    }
}
