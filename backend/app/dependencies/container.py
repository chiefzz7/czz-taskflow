"""
Application-level dependency container.
All repositories and services are instantiated here as singletons.
This is the only place where concrete implementations are wired up.
Replace InMemory* with SQL* implementations here when migrating to PostgreSQL.
"""
from app.repositories.user_repository import SQLUserRepository
from app.repositories.task_repository import SQLTaskRepository
from app.repositories.enterprise_repository import SQLEnterpriseRepository
from app.repositories.chat_repository import SQLChatRepository
from app.repositories.social_repository import SQLSocialRepository

from app.services.auth_service import AuthService
from app.services.recurrence_service import RecurrenceService
from app.services.task_service import TaskService
from app.services.enterprise_service import EnterpriseService
from app.services.dashboard_service import DashboardService
from app.services.report_service import ReportService
from app.services.chat_service import ChatService
from app.services.storage_service import get_storage_service
from app.services.social_service import SocialService

# ── Repositories (Supabase PostgreSQL) ───────────────────────────────────────
user_repo = SQLUserRepository()
task_repo = SQLTaskRepository()
enterprise_repo = SQLEnterpriseRepository()
chat_repo = SQLChatRepository()
social_repo = SQLSocialRepository()


# ── Services ─────────────────────────────────────────────────────────────────
recurrence_service = RecurrenceService()
auth_service = AuthService(user_repo=user_repo)
task_service = TaskService(task_repo=task_repo, recurrence_service=recurrence_service)
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

