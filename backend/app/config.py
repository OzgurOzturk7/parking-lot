from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg2://parking:parking@127.0.0.1:5433/parking"
    redis_url: str = "redis://127.0.0.1:6380/0"
    jwt_secret: str = "change-me-in-production"
    jwt_expire_minutes: int = 120

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
