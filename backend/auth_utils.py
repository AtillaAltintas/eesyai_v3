# auth_utils.py

import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv, find_dotenv

# load the same .env you use in main.py
env_path = find_dotenv()
load_dotenv(env_path, override=True)

SECRET_KEY = os.getenv("SECRET_KEY")
print("🔐 [auth_utils] SECRET_KEY =", repr(SECRET_KEY))    # <<< debug

ALGORITHM  = "HS256"
ACCESS_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        print("⚠️ [auth_utils] JWT decode error:", e)         # <<< debug
        return None

