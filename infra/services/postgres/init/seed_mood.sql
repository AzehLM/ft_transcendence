CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
    v_user_alice_id UUID := gen_random_uuid();
    v_user_bob_id UUID := gen_random_uuid();
    v_org_42lyon_id UUID := gen_random_uuid();
    v_folder_root_id UUID := gen_random_uuid();
    v_file_secret_id UUID := gen_random_uuid();
BEGIN

    INSERT INTO users (id, email, salt_1, public_key, encrypted_private_key, auth_hash)
    VALUES
    (
        v_user_alice_id,
        'alice@student.42lyon.fr',
        gen_random_bytes(16),
        gen_random_bytes(512),
        gen_random_bytes(1024),
        crypt('client_hmac_mock_password', gen_salt('bf', 10))
    ),
    (
        v_user_bob_id,
        'bob@student.42lyon.fr',
        gen_random_bytes(16),
        gen_random_bytes(512),
        gen_random_bytes(1024),
        crypt('client_hmac_mock_password', gen_salt('bf', 10))
    );

    INSERT INTO organizations (id, name, public_key)
    VALUES (
        v_org_42lyon_id,
        '42 Lyon E2EE Team',
        gen_random_bytes(512)
    );

    INSERT INTO org_members (org_id, user_id, role, enc_org_priv_key)
    VALUES
    (v_org_42lyon_id, v_user_alice_id, 'ADMIN', gen_random_bytes(1024)),
    (v_org_42lyon_id, v_user_bob_id, 'MEMBER', gen_random_bytes(1024));

    INSERT INTO folders (id, owner_user_id, org_id, parent_id, name)
    VALUES (
        v_folder_root_id,
        v_user_alice_id,
        NULL,
        NULL,
        'Projets Secrets'
    );

    INSERT INTO files (id, owner_user_id, org_id, folder_id, name, file_size, minio_object_key, encrypted_dek, iv)
    VALUES (
        v_file_secret_id,
        v_user_alice_id,
        NULL,
        v_folder_root_id,
        'architecture_ft_box.pdf',
        1048576, -- 1 MB
        gen_random_uuid(), -- L'ID de l'objet dans MinIO
        gen_random_bytes(32), -- Mock : DEK chiffrée
        gen_random_bytes(12)  -- Mock : IV pour AES-GCM
    );

    RAISE NOTICE 'Base de données ft_box initialisée avec succès avec des données de test.';
END $$;
