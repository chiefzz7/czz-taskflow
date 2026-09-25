from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

# Conexão com o banco de dados PostgreSQL do Supabase
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)


from sqlalchemy import text


def create_db_and_tables() -> None:
    """Garante a criação de todas as tabelas no Supabase."""
    SQLModel.metadata.create_all(engine)
    # Ensure newly added columns exist in Supabase tables
    with Session(engine) as session:
        migrations = [
            "ALTER TABLE recurrences ADD COLUMN IF NOT EXISTS days_of_month VARCHAR;",
            "ALTER TABLE enterprises ADD COLUMN IF NOT EXISTS invite_code VARCHAR;",
            "ALTER TABLE enterprise_members ADD COLUMN IF NOT EXISTS custom_role_id VARCHAR;",
            "ALTER TABLE enterprise_members ADD COLUMN IF NOT EXISTS job_title VARCHAR;",
        ]
        for sql in migrations:
            try:
                session.exec(text(sql))
                session.commit()
            except Exception:
                session.rollback()



def get_session():
    """Generator de sessão para injeção de dependência no FastAPI."""
    with Session(engine) as session:
        yield session
