-- AI Image Prompt Library Database Schema
-- Designed for Turso (SQLite)

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    imageUrl TEXT NOT NULL DEFAULT '',
    displayOrder INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    promptText TEXT NOT NULL,
    imageUrl TEXT NOT NULL,
    category_id TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    isTrending INTEGER NOT NULL DEFAULT 0,
    isNew INTEGER NOT NULL DEFAULT 0,
    outputType TEXT NOT NULL DEFAULT 'HQ 1:1',
    aiModel TEXT NOT NULL DEFAULT 'Gemini 2.0 Flash',
    gender TEXT NOT NULL DEFAULT 'Male',
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS prompt_likes (
    id TEXT PRIMARY KEY,
    prompt_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
    UNIQUE(prompt_id, user_id)
);

CREATE TABLE IF NOT EXISTS fcm_devices (
    id TEXT PRIMARY KEY,
    installation_id TEXT NOT NULL UNIQUE,
    fcm_token TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Indexes for common read/filtering operations
CREATE INDEX IF NOT EXISTS idx_prompts_category_id ON prompts(category_id);
CREATE INDEX IF NOT EXISTS idx_prompts_isTrending ON prompts(isTrending);
CREATE INDEX IF NOT EXISTS idx_prompts_isNew ON prompts(isNew);
CREATE INDEX IF NOT EXISTS idx_prompts_createdAt ON prompts(createdAt);
CREATE INDEX IF NOT EXISTS idx_prompt_likes_prompt_id ON prompt_likes(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_likes_created_at ON prompt_likes(created_at);
CREATE INDEX IF NOT EXISTS idx_fcm_devices_installation_id ON fcm_devices(installation_id);
CREATE INDEX IF NOT EXISTS idx_fcm_devices_fcm_token ON fcm_devices(fcm_token);
