from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

# Conexão com o banco de dados PostgreSQL do Supabase
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)


def create_db_and_tables() -> None:
    """Garante a criação de todas as tabelas no Supabase."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Generator de sessão para injeção de dependência no FastAPI."""
    with Session(engine) as session:
        yield session
