#!/bin/sh
set -e

PRIVATE_KEY_PATH="${JWT_PRIVATE_KEY_PATH:-keys/private.pem}"
PUBLIC_KEY_PATH="${JWT_PUBLIC_KEY_PATH:-keys/public.pem}"

if [ ! -f "$PRIVATE_KEY_PATH" ]; then
    echo "JWT keys not found — generating a new RS256 keypair at $(dirname "$PRIVATE_KEY_PATH")"
    mkdir -p "$(dirname "$PRIVATE_KEY_PATH")"
    python -c "
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

with open('$PRIVATE_KEY_PATH', 'wb') as f:
    f.write(key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption(),
    ))

with open('$PUBLIC_KEY_PATH', 'wb') as f:
    f.write(key.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    ))
"
fi

echo "Running database migrations..."
alembic upgrade head

exec "$@"
