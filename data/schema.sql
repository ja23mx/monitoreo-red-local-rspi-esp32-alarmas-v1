-- Tabla de dispositivos
CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY,
    mac TEXT UNIQUE NOT NULL,
    nickname TEXT NOT NULL,
    location TEXT NOT NULL,
    track INTEGER NOT NULL,
    ult_cnx TEXT,
    alarm_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mac ON devices(mac);
CREATE INDEX IF NOT EXISTS idx_ult_cnx ON devices(ult_cnx);

-- Tabla de eventos
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    event_id TEXT NOT NULL,
    time TEXT NOT NULL,
    event_type TEXT NOT NULL,
    data TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_device_id ON events(device_id);
CREATE INDEX IF NOT EXISTS idx_time ON events(time);
CREATE INDEX IF NOT EXISTS idx_event_type ON events(event_type);
