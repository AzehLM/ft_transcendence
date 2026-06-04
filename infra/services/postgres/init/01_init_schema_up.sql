CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255),
    family_name VARCHAR(255),
    client_salt BYTEA NOT NULL,
    server_salt BYTEA NOT NULL,
    iv BYTEA NOT NULL,
    public_key BYTEA NOT NULL,
    encrypted_private_key BYTEA NOT NULL,
    auth_hash VARCHAR(255) NOT NULL,
    used_space BIGINT NOT NULL DEFAULT 0,
    max_space BIGINT NOT NULL DEFAULT 5368709120,
    refresh_token VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    totp_secret_encrypted BYTEA,
    recovery_codes_hashed BYTEA
);

-- 2. CREDENTIALS
CREATE TABLE credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id BYTEA NOT NULL,
    public_key BYTEA NOT NULL,
    device_name VARCHAR(100) NOT NULL,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, credential_id)
);

-- 3. ORGANIZATIONS
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    public_key BYTEA NOT NULL,
	used_space BIGINT NOT NULL DEFAULT 0,
    max_space BIGINT NOT NULL DEFAULT 5368709120, -- 5 GB
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. ORG_MEMBERS
CREATE TABLE org_members (
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'member')),
    description VARCHAR(250),
    enc_org_priv_key BYTEA NOT NULL,
    enc_aes_key     BYTEA NOT NULL,
    iv              BYTEA NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (org_id, user_id)
);

-- 5. FOLDERS
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. FILES
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    name VARCHAR(2048) NOT NULL,
    file_size BIGINT NOT NULL,
    minio_object_key UUID UNIQUE NOT NULL,
    upload_id VARCHAR(255),
    encrypted_dek BYTEA NOT NULL,
    iv BYTEA NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. USER_AVATARS
CREATE TABLE user_avatars (
    user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data           BYTEA        NOT NULL,
    content_type   VARCHAR(50)  NOT NULL,
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_files_folder_id ON files(folder_id);
CREATE INDEX idx_credentials_user_id ON credentials(user_id);
