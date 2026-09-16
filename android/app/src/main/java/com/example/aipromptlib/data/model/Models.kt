package com.example.aipromptlib.data.model

data class Prompt(
    val id: String,
    val title: String,
    val promptText: String,
    val imageUrl: String,
    val category: String,
    val tags: List<String>,
    val isTrending: Boolean,
    val isNew: Boolean,
    val createdAt: Long
)

data class Category(
    val id: String,
    val name: String,
    val description: String?,
    val imageUrl: String?,
    val createdAt: Long
)
