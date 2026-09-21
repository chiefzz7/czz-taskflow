"""
Application-level dependency container.
All repositories and services are instantiated here as singletons.
This is the only place where concrete implementations are wired up.
Replace InMemory* with SQL* implementations here when migrating to PostgreSQL.
"""
from app.repositories.user_repository import InMemoryUserRepository
from app.repositories.task_repository import InMemoryTaskRepository
from app.repositories.enterprise_repository import InMemoryEnterpriseRepository
from app.repositories.chat_repository import InMemoryChatRepository
from app.repositories.social_repository import InMemorySocialRepository

from app.services.auth_service import AuthService
from app.services.task_service import TaskService
from app.services.enterprise_service import EnterpriseService
from app.services.dashboard_service import DashboardService
from app.services.report_service import ReportService
from app.services.chat_service import ChatService
from app.services.storage_service import get_storage_service
from app.services.social_service import SocialService

# ── Repositories (singletons for development) ────────────────────────────────
user_repo = InMemoryUserRepository()
task_repo = InMemoryTaskRepository()
enterprise_repo = InMemoryEnterpriseRepository()
chat_repo = InMemoryChatRepository()
social_repo = InMemorySocialRepository()

# ── Services ─────────────────────────────────────────────────────────────────
auth_service = AuthService(user_repo=user_repo)
task_service = TaskService(task_repo=task_repo)
enterprise_service = EnterpriseService(enterprise_repo=enterprise_repo, user_repo=user_repo)
dashboard_service = DashboardService(task_repo=task_repo, enterprise_repo=enterprise_repo, user_repo=user_repo)
report_service = ReportService(task_repo=task_repo)
chat_service = ChatService(chat_repo=chat_repo, enterprise_repo=enterprise_repo, user_repo=user_repo)
storage_service = get_storage_service()
social_service = SocialService(
    social_repo=social_repo,
    enterprise_repo=enterprise_repo,
    user_repo=user_repo,
    storage_service=storage_service,
)

