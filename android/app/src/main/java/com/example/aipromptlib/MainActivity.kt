package com.example.aipromptlib

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.example.aipromptlib.data.repository.RepositoryProvider
import com.example.aipromptlib.ui.navigation.AppNavigation
import com.example.aipromptlib.ui.theme.AIPromptLibraryTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        RepositoryProvider.init(this)
        
        setContent {
            AIPromptLibraryTheme {
                AppNavigation()
            }
        }
    }
}
