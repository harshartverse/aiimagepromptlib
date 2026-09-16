package com.example.aipromptlib.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "saved_prompts")

class SavedPromptStore(private val context: Context) {
    private val SAVED_IDS_KEY = stringSetPreferencesKey("saved_ids")

    val savedPromptIds: Flow<Set<String>> = context.dataStore.data.map { preferences ->
        preferences[SAVED_IDS_KEY] ?: emptySet()
    }

    suspend fun toggleSave(promptId: String) {
        context.dataStore.edit { preferences ->
            val current = preferences[SAVED_IDS_KEY] ?: emptySet()
            val updated = current.toMutableSet()
            if (!updated.add(promptId)) {
                updated.remove(promptId)
            }
            preferences[SAVED_IDS_KEY] = updated
        }
    }
}
