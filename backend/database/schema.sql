-- AI Image Prompt Library Database Schema
-- Designed for Turso (SQLite)

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    imageUrl TEXT,
    createdAt INTEGER NOT NULL -- Stored as Unix timestamp (milliseconds)
);

CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    promptText TEXT NOT NULL,
    imageUrl TEXT,
    category TEXT NOT NULL,
    tags TEXT, -- Stored as a JSON array string e.g., '["tag1", "tag2"]'
    isTrending INTEGER NOT NULL DEFAULT 0, -- Boolean: 0 or 1
    isNew INTEGER NOT NULL DEFAULT 0, -- Boolean: 0 or 1
    createdAt INTEGER NOT NULL, -- Stored as Unix timestamp (milliseconds)
    FOREIGN KEY (category) REFERENCES categories(id)
);

-- Indexes for common read/filtering operations
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_isTrending ON prompts(isTrending);
CREATE INDEX IF NOT EXISTS idx_prompts_isNew ON prompts(isNew);
CREATE INDEX IF NOT EXISTS idx_prompts_createdAt ON prompts(createdAt);
