package com.example.aipromptlib.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.aipromptlib.data.model.Prompt
import com.example.aipromptlib.data.repository.PromptRepository
import com.example.aipromptlib.data.repository.RepositoryProvider
import kotlinx.coroutines.flow.*

class SavedViewModel(
    private val repository: PromptRepository = RepositoryProvider.instance
) : ViewModel() {

    val savedPrompts: StateFlow<List<Prompt>> = combine(
        repository.getAllPrompts(),
        repository.savedPromptIds
    ) { allPrompts, savedIds ->
        allPrompts.filter { savedIds.contains(it.id) }
    }.stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    val savedPromptIds: StateFlow<Set<String>> = repository.savedPromptIds
        .stateIn(viewModelScope, SharingStarted.Lazily, emptySet())

    fun toggleSave(promptId: String) {
        repository.toggleSave(promptId)
    }
}
