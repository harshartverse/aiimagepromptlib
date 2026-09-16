package com.example.aipromptlib.data.repository

import com.example.aipromptlib.data.model.Prompt
import com.example.aipromptlib.data.model.Category
import kotlinx.coroutines.flow.Flow

interface PromptRepository {
    fun getTrendingPrompts(): Flow<List<Prompt>>
    fun getNewPrompts(): Flow<List<Prompt>>
    fun getCategories(): Flow<List<Category>>
    fun getAllPrompts(): Flow<List<Prompt>>
    fun getPromptsByCategory(categoryName: String): Flow<List<Prompt>>
    suspend fun getPromptById(id: String): Prompt?
    suspend fun getCategoryById(id: String): Category?
    val savedPromptIds: Flow<Set<String>>
    fun toggleSave(promptId: String)
    suspend fun refresh() // Added refresh method
}
