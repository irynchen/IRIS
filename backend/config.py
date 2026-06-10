from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 720

    IRIS_USERNAME: str
    IRIS_PASSWORD_HASH: str

    # Email notifications
    SMTP_HOST: str = "mail.gmx.net"
    SMTP_PORT: int = 587
    SMTP_USER: str = "iryna.shevchenko@gmx.net"
    SMTP_PASSWORD: str = ""
    NOTIFY_EMAIL: str = "iryna.shevchenko@gmx.net"
    NOTIFY_HOUR: int = 8

    class Config:
        env_file = ".env"

settings = Settings()
