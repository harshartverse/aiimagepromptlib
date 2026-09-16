package com.example.aipromptlib.data.remote

import com.example.aipromptlib.data.model.Category
import com.example.aipromptlib.data.model.Prompt
import retrofit2.http.GET

interface ApiService {
    @GET("prompts")
    suspend fun getPrompts(): List<Prompt>

    @GET("categories")
    suspend fun getCategories(): List<Category>
}
