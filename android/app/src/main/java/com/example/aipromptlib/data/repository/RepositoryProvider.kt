package com.example.aipromptlib.data.repository

import android.annotation.SuppressLint
import android.content.Context
import com.example.aipromptlib.data.local.SavedPromptStore

@SuppressLint("StaticFieldLeak")
object RepositoryProvider {
    private var _instance: PromptRepository? = null

    val instance: PromptRepository
        get() = _instance ?: throw IllegalStateException("RepositoryProvider is not initialized, call init(context) first.")

    fun init(context: Context) {
        if (_instance == null) {
            val store = SavedPromptStore(context.applicationContext)
            _instance = RemotePromptRepository(store)
        }
    }
}
