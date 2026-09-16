package com.example.aipromptlib.data.repository

import com.example.aipromptlib.data.local.SavedPromptStore
import com.example.aipromptlib.data.model.Category
import com.example.aipromptlib.data.model.Prompt
import com.example.aipromptlib.data.remote.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class RemotePromptRepository(
    private val savedPromptStore: SavedPromptStore
) : PromptRepository {

    private val _prompts = MutableStateFlow<List<Prompt>>(emptyList())
    private val _categories = MutableStateFlow<List<Category>>(emptyList())
    private val scope = CoroutineScope(Dispatchers.IO)

    init {
        scope.launch { refresh() }
    }

    override suspend fun refresh() {
        withContext(Dispatchers.IO) {
            val fetchedCategories = ApiClient.apiService.getCategories()
            _categories.value = fetchedCategories
            
            val fetchedPrompts = ApiClient.apiService.getPrompts()
            _prompts.value = fetchedPrompts
        }
    }

    override val savedPromptIds: Flow<Set<String>> = savedPromptStore.savedPromptIds

    override fun toggleSave(promptId: String) {
        scope.launch {
            savedPromptStore.toggleSave(promptId)
        }
    }

    override fun getTrendingPrompts(): Flow<List<Prompt>> = _prompts.map { list ->
        list.filter { it.isTrending }
    }

    override fun getNewPrompts(): Flow<List<Prompt>> = _prompts.map { list ->
        list.filter { it.isNew }
    }

    override fun getCategories(): Flow<List<Category>> = _categories

    override fun getAllPrompts(): Flow<List<Prompt>> = _prompts

    override fun getPromptsByCategory(categoryName: String): Flow<List<Prompt>> = _prompts.map { list ->
        val categoryId = _categories.value.find { it.name.equals(categoryName, true) }?.id ?: categoryName
        list.filter { it.category == categoryId || it.category.equals(categoryName, true) }
    }

    override suspend fun getPromptById(id: String): Prompt? = withContext(Dispatchers.IO) {
        _prompts.value.find { it.id == id } ?: try {
            val fresh = ApiClient.apiService.getPrompts()
            _prompts.value = fresh
            fresh.find { it.id == id }
        } catch (e: Exception) { null }
    }

    override suspend fun getCategoryById(id: String): Category? = withContext(Dispatchers.IO) {
        _categories.value.find { it.id == id || it.name.equals(id, true) } ?: try {
            val fresh = ApiClient.apiService.getCategories()
            _categories.value = fresh
            fresh.find { it.id == id || it.name.equals(id, true) }
        } catch (e: Exception) { null }
    }
}
