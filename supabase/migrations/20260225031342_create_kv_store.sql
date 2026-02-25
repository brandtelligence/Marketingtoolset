/*
  # Create KV Store Table

  1. New Tables
    - `kv_store_309fe679`
      - `key` (text, primary key) - Unique identifier for stored values
      - `value` (jsonb) - JSON value stored for the key
  
  2. Security
    - Enable RLS on `kv_store_309fe679` table
    - Service role only access (no public policies needed)
  
  3. Notes
    - This table is used by the edge function for key-value storage
    - No user-facing policies needed as all access is via service role
*/

CREATE TABLE IF NOT EXISTS kv_store_309fe679 (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);

ALTER TABLE kv_store_309fe679 ENABLE ROW LEVEL SECURITY;
