
-- ============================================================
--  Women Safety App — Full Database Migration Script
--  Run this once to create the database, all tables, and seed data.
--  Compatible with: MySQL 8.x
-- ============================================================

-- ============================================================
-- 1. CREATE & SELECT DATABASE
-- ============================================================
CREATE DATABASE IF NOT EXISTS women_safety_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE women_safety_db;


CREATE TABLE IF NOT EXISTS live_location_sessions (
  id            INT           NOT NULL AUTO_INCREMENT,
  user_id       INT           NOT NULL,
  trip_id       INT                    DEFAULT NULL COMMENT 'NULL = standalone share, set = journey share',
  latitude      DECIMAL(10,7) NOT NULL,
  longitude     DECIMAL(10,7) NOT NULL,
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  started_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ended_at      DATETIME               DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_lls_user_active (user_id, is_active),
  CONSTRAINT fk_lls_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_lls_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- ============================================================
-- 2. SAMPLE AADHAAR DATA
--    Lookup table used to validate Aadhaar numbers and
--    retrieve the linked mobile number before OTP is sent.
-- ============================================================
CREATE TABLE IF NOT EXISTS sample_aadhaar_data (
  id             INT           NOT NULL AUTO_INCREMENT,
  aadhaar_number CHAR(12)      NOT NULL,
  mobile_number  VARCHAR(15)   NOT NULL,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_aadhaar (aadhaar_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. OTP VERIFICATIONS
--    Stores short-lived OTPs tied to an Aadhaar number.
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_verifications (
  id             INT           NOT NULL AUTO_INCREMENT,
  aadhaar_number CHAR(12)      NOT NULL,
  mobile_number  VARCHAR(15)   NOT NULL,
  otp            VARCHAR(10)   NOT NULL,
  expires_at     DATETIME      NOT NULL,
  verified       TINYINT(1)    NOT NULL DEFAULT 0,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_aadhaar_verified (aadhaar_number, verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. USERS
--    Registered app users.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id             INT           NOT NULL AUTO_INCREMENT,
  name           VARCHAR(100)  NOT NULL,
  gender         VARCHAR(20)   NOT NULL,
  dob            DATE          NOT NULL,
  email          VARCHAR(150)  NOT NULL,
  username       VARCHAR(50)   NOT NULL,
  mobile_number  VARCHAR(15)   NOT NULL,
  password_hash  VARCHAR(255)  NOT NULL,
  aadhaar_number CHAR(12)      NOT NULL,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email          (email),
  UNIQUE KEY uq_username       (username),
  UNIQUE KEY uq_mobile         (mobile_number),
  UNIQUE KEY uq_aadhaar        (aadhaar_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 5. GUARDIAN RELATIONSHIPS
--    Many-to-many between a user (ward) and their guardian.
--    status: 'pending' | 'accepted' | 'rejected'
-- ============================================================
CREATE TABLE IF NOT EXISTS guardian_relationships (
  id             INT           NOT NULL AUTO_INCREMENT,
  user_id        INT           NOT NULL,
  guardian_id    INT           NOT NULL,
  status         ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  requested_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at   DATETIME               DEFAULT NULL,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_guardian  (user_id, guardian_id),
  KEY idx_guardian_status      (guardian_id, status),
  CONSTRAINT fk_gr_user        FOREIGN KEY (user_id)     REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_gr_guardian    FOREIGN KEY (guardian_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 6. DANGER ALERTS
--    SOS alerts triggered by the user.
--    status: 'active' | 'resolved'
-- ============================================================
CREATE TABLE IF NOT EXISTS danger_alerts (
  id          INT           NOT NULL AUTO_INCREMENT,
  user_id     INT           NOT NULL,
  latitude    DECIMAL(10,7)          DEFAULT NULL,
  longitude   DECIMAL(10,7)          DEFAULT NULL,
  message     TEXT                   DEFAULT NULL,
  status      ENUM('active','resolved') NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_da_user (user_id),
  CONSTRAINT fk_da_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 7. ALERT NOTIFICATIONS
--    Which guardians have been notified for each danger alert.
-- ============================================================
CREATE TABLE IF NOT EXISTS alert_notifications (
  id          INT       NOT NULL AUTO_INCREMENT,
  alert_id    INT       NOT NULL,
  guardian_id INT       NOT NULL,
  seen        TINYINT(1) NOT NULL DEFAULT 0,
  seen_at     DATETIME           DEFAULT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_an_guardian (guardian_id),
  CONSTRAINT fk_an_alert    FOREIGN KEY (alert_id)    REFERENCES danger_alerts (id) ON DELETE CASCADE,
  CONSTRAINT fk_an_guardian FOREIGN KEY (guardian_id) REFERENCES users         (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 8. TRIPS
--    A journey started by a user.
--    status: 'active' | 'completed' | 'cancelled'
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
  id                INT            NOT NULL AUTO_INCREMENT,
  user_id           INT            NOT NULL,
  from_address      VARCHAR(500)   NOT NULL,
  to_address        VARCHAR(500)   NOT NULL,
  from_latitude     DECIMAL(10,7)  NOT NULL,
  from_longitude    DECIMAL(10,7)  NOT NULL,
  to_latitude       DECIMAL(10,7)  NOT NULL,
  to_longitude      DECIMAL(10,7)  NOT NULL,
  polyline_json     LONGTEXT                DEFAULT NULL,
  status            ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
  started_at        DATETIME       NOT NULL,
  ended_at          DATETIME                DEFAULT NULL,
  duration          BIGINT                  DEFAULT NULL COMMENT 'milliseconds',
  total_gps_points  INT            NOT NULL DEFAULT 0,
  deviation_count   INT            NOT NULL DEFAULT 0,
  created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_trips_user_status (user_id, status),
  CONSTRAINT fk_trips_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 9. GPS POINTS
--    Live GPS track for each trip.
-- ============================================================
CREATE TABLE IF NOT EXISTS gps_points (
  id          INT           NOT NULL AUTO_INCREMENT,
  trip_id     INT           NOT NULL,
  latitude    DECIMAL(10,7) NOT NULL,
  longitude   DECIMAL(10,7) NOT NULL,
  accuracy    FLOAT                  DEFAULT NULL,
  recorded_at DATETIME      NOT NULL,
  PRIMARY KEY (id),
  KEY idx_gps_trip (trip_id),
  CONSTRAINT fk_gps_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 10. DEVIATION ALERTS
--     Logged when the user's GPS deviates from the planned route.
--     user_response: 'safe' | 'emergency' | 'no_response'
-- ============================================================
CREATE TABLE IF NOT EXISTS deviation_alerts (
  id                   INT           NOT NULL AUTO_INCREMENT,
  trip_id              INT           NOT NULL,
  user_id              INT           NOT NULL,
  deviation_percentage DECIMAL(5,2)           DEFAULT NULL,
  alert_latitude       DECIMAL(10,7)          DEFAULT NULL,
  alert_longitude      DECIMAL(10,7)          DEFAULT NULL,
  user_response        ENUM('safe','emergency','no_response') NOT NULL DEFAULT 'no_response',
  created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dev_trip (trip_id),
  CONSTRAINT fk_dev_trip FOREIGN KEY (trip_id)  REFERENCES trips (id) ON DELETE CASCADE,
  CONSTRAINT fk_dev_user FOREIGN KEY (user_id)  REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 11. GUARDIAN JOURNEY NOTIFICATIONS
--     Notifies guardians of journey lifecycle events.
--     notification_type: 'journey_started' | 'journey_completed' | 'deviation_alert'
-- ============================================================
CREATE TABLE IF NOT EXISTS guardian_journey_notifications (
  id                INT       NOT NULL AUTO_INCREMENT,
  trip_id           INT       NOT NULL,
  guardian_id       INT       NOT NULL,
  notification_type ENUM('journey_started','journey_completed','deviation_alert') NOT NULL,
  seen              TINYINT(1) NOT NULL DEFAULT 0,
  created_at        TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_gjn_guardian (guardian_id),
  KEY idx_gjn_trip     (trip_id),
  CONSTRAINT fk_gjn_trip     FOREIGN KEY (trip_id)     REFERENCES trips (id) ON DELETE CASCADE,
  CONSTRAINT fk_gjn_guardian FOREIGN KEY (guardian_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- 12. SEED DATA — Sample Aadhaar records for testing
-- ============================================================
INSERT IGNORE INTO sample_aadhaar_data (aadhaar_number, mobile_number) VALUES
  ('123456789012', '9876543210'),
  ('234567890123', '9876543211'),
  ('345678901234', '9876543212'),
  ('456789012345', '9876543213'),
  ('567890123456', '9876543214'),
  ('678901234567', '9876543215'),
  ('789012345678', '9876543216'),
  ('890123456789', '9876543217'),
  ('901234567890', '9876543218'),
  ('112233445566', '9876543219');


-- ============================================================
-- Done. All tables created and seed data inserted.
-- ============================================================

