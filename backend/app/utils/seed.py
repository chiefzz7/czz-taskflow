"""
Development seed data.
Creates sample users, enterprise, tasks, and chat messages.
Credentials are for development ONLY — never use in production.
"""
from datetime import datetime, timezone, timedelta

from app.core.security import hash_password
from app.models.user import User
from app.models.task import Task, TaskAssignee
from app.models.enterprise import Enterprise, EnterpriseMember
from app.models.chat import Chat, ChatMember, Message
from app.models.enums import (
    UserStatus, ThemePreference, TaskStatus, TaskPriority,
    WorkspaceType, EnterpriseRole, MemberStatus, ChatType, MessageType, MessageStatus,
)
from app.models.social import (
    SocialPost, SocialPlatform, SocialPostStatus, SocialMediaType,
)
from app.dependencies.container import (
    user_repo, task_repo, enterprise_repo, chat_repo, social_repo,
)



async def run_seed() -> None:
    now = datetime.now(timezone.utc)

    # ── Users ─────────────────────────────────────────────────────────────────
    admin = User(
        id="user-admin-001",
        name="Alex Admin",
        email="admin@taskflow.local",
        password_hash=hash_password("Admin@123"),
        status=UserStatus.active,
        theme=ThemePreference.dark,
        timezone="America/Sao_Paulo",
    )
    manager = User(
        id="user-manager-001",
        name="Maria Manager",
        email="manager@taskflow.local",
        password_hash=hash_password("Manager@123"),
        status=UserStatus.active,
        theme=ThemePreference.light,
        timezone="America/Sao_Paulo",
    )
    member = User(
        id="user-member-001",
        name="Carlos Member",
        email="member@taskflow.local",
        password_hash=hash_password("Member@123"),
        status=UserStatus.active,
        theme=ThemePreference.system,
        timezone="America/Sao_Paulo",
    )
    personal_user = User(
        id="user-personal-001",
        name="João Personal",
        email="user@taskflow.local",
        password_hash=hash_password("User@123"),
        status=UserStatus.active,
        theme=ThemePreference.system,
        timezone="America/Sao_Paulo",
    )

    for u in [admin, manager, member, personal_user]:
        await user_repo.save(u)

    # ── Enterprise ────────────────────────────────────────────────────────────
    enterprise = Enterprise(
        id="ent-acme-001",
        name="Acme Corp",
        description="A modern technology company leading innovation",
        owner_id=admin.id,
        created_at=now,
        updated_at=now,
    )
    await enterprise_repo.save(enterprise)

    for user, role in [
        (admin, EnterpriseRole.admin),
        (manager, EnterpriseRole.manager),
        (member, EnterpriseRole.member),
    ]:
        m = EnterpriseMember(
            enterprise_id=enterprise.id,
            user_id=user.id,
            role=role,
            status=MemberStatus.active,
            joined_at=now,
        )
        await enterprise_repo.save_member(m)

    # ── Personal Tasks (user@taskflow.local) ─────────────────────────────────
    personal_tasks = [
        Task(
            id=f"ptask-{i:03d}",
            title=title,
            description=desc,
            status=status,
            priority=priority,
            workspace=WorkspaceType.personal,
            creator_id=personal_user.id,
            due_at=now + timedelta(days=due_days) if due_days else None,
            completed_at=now - timedelta(days=1) if status == TaskStatus.done else None,
            created_at=now - timedelta(days=7 - i),
            updated_at=now - timedelta(days=7 - i),
        )
        for i, (title, desc, status, priority, due_days) in enumerate([
            ("Setup development environment", "Install Node.js, Python, uv and configure VS Code", TaskStatus.done, TaskPriority.high, None),
            ("Read project documentation", "Review all requirements and architecture docs", TaskStatus.done, TaskPriority.medium, None),
            ("Design database schema", "Model all entities and relationships", TaskStatus.in_progress, TaskPriority.high, 2),
            ("Implement authentication", "JWT login, registration, protected routes", TaskStatus.in_progress, TaskPriority.urgent, 1),
            ("Build task management API", "CRUD endpoints for personal tasks", TaskStatus.todo, TaskPriority.high, 5),
            ("Create dashboard components", "Charts, metrics, and stat cards", TaskStatus.todo, TaskPriority.medium, 7),
            ("Write unit tests", "Cover auth, tasks, and RBAC", TaskStatus.backlog, TaskPriority.medium, 14),
            ("Setup CI/CD pipeline", "GitHub Actions for automated testing", TaskStatus.backlog, TaskPriority.low, 21),
        ], 1)
    ]
    for task in personal_tasks:
        await task_repo.save(task)

    # ── Enterprise Tasks ──────────────────────────────────────────────────────
    enterprise_tasks = [
        Task(
            id=f"etask-{i:03d}",
            title=title,
            description=desc,
            status=status,
            priority=priority,
            workspace=WorkspaceType.enterprise,
            enterprise_id=enterprise.id,
            creator_id=admin.id,
            responsible_id=responsible_id,
            is_public=True,
            due_at=now + timedelta(days=due_days) if due_days else None,
            completed_at=now - timedelta(days=1) if status == TaskStatus.done else None,
            created_at=now - timedelta(days=14 - i),
            updated_at=now - timedelta(days=14 - i),
        )
        for i, (title, desc, status, priority, responsible_id, due_days) in enumerate([
            ("Q4 Product Roadmap", "Define and prioritize all Q4 product features", TaskStatus.in_progress, TaskPriority.urgent, admin.id, 3),
            ("Customer Onboarding Flow", "Design and implement new customer onboarding UX", TaskStatus.in_progress, TaskPriority.high, manager.id, 7),
            ("API Performance Optimization", "Reduce average response time by 40%", TaskStatus.todo, TaskPriority.high, manager.id, 10),
            ("Security Audit", "Third-party security review and penetration testing", TaskStatus.todo, TaskPriority.urgent, admin.id, 5),
            ("Mobile App v2.0", "Native iOS and Android versions", TaskStatus.backlog, TaskPriority.medium, member.id, 30),
            ("Analytics Dashboard", "Real-time business metrics dashboard", TaskStatus.review, TaskPriority.medium, member.id, 14),
            ("Team Training Sessions", "Weekly knowledge sharing sessions", TaskStatus.done, TaskPriority.low, manager.id, None),
            ("Documentation Update", "Update all API and product documentation", TaskStatus.in_progress, TaskPriority.medium, member.id, 7),
            ("Bug Bash Sprint", "Dedicated sprint to resolve backlog bugs", TaskStatus.todo, TaskPriority.high, manager.id, 4),
            ("Infrastructure Migration", "Move services to new cloud provider", TaskStatus.backlog, TaskPriority.medium, admin.id, 45),
        ], 1)
    ]
    for task in enterprise_tasks:
        await task_repo.save(task)

    # ── Chat ──────────────────────────────────────────────────────────────────
    general_chat = Chat(
        id="chat-general-001",
        enterprise_id=enterprise.id,
        name="# general",
        type=ChatType.channel,
        created_at=now,
    )
    engineering_chat = Chat(
        id="chat-engineering-001",
        enterprise_id=enterprise.id,
        name="# engineering",
        type=ChatType.channel,
        created_at=now,
    )
    await chat_repo.save(general_chat)
    await chat_repo.save(engineering_chat)

    for user in [admin, manager, member]:
        await chat_repo.add_member(ChatMember(chat_id=general_chat.id, user_id=user.id, joined_at=now))
        await chat_repo.add_member(ChatMember(chat_id=engineering_chat.id, user_id=user.id, joined_at=now))

    # Seed messages
    seed_messages = [
        (general_chat.id, admin.id, "Welcome to Acme Corp TaskFlow! 🎉 This is our central hub for collaboration.", now - timedelta(hours=3)),
        (general_chat.id, manager.id, "Thanks Alex! Excited to have everyone onboard. Let's make this quarter count 🚀", now - timedelta(hours=2, minutes=45)),
        (general_chat.id, member.id, "Hey everyone! Looking forward to working together here.", now - timedelta(hours=2, minutes=30)),
        (general_chat.id, admin.id, "Carlos, could you take a look at the Analytics Dashboard task? It's in review.", now - timedelta(hours=1)),
        (general_chat.id, member.id, "Sure! Will check it now and give feedback by EOD.", now - timedelta(minutes=45)),
        (engineering_chat.id, manager.id, "Engineering team — let's prioritize the API Performance task this sprint.", now - timedelta(hours=1, minutes=30)),
        (engineering_chat.id, member.id, "Agreed. I'll start profiling the slow endpoints today.", now - timedelta(hours=1)),
        (engineering_chat.id, admin.id, "Great. Security audit also needs attention — we have a deadline in 5 days.", now - timedelta(minutes=20)),
    ]

    for chat_id, author_id, content, created_at in seed_messages:
        msg = Message(
            chat_id=chat_id,
            enterprise_id=enterprise.id,
            author_id=author_id,
            content=content,
            type=MessageType.text,
            status=MessageStatus.read,
            created_at=created_at,
        )
        await chat_repo.save_message(msg)

    # ── Social Media Posts (Artes e Publicações) ──────────────────────────────
    social_posts = [
        SocialPost(
            title="Arte de Lançamento da Versão 2.0",
            caption="Chegou a nova versão do TaskFlow! Mais rápido, intuitivo e com Kanban turbinado. Experimente hoje mesmo. 🚀 #TaskFlow #Produtividade #Tech",
            platform=SocialPlatform.instagram,
            status=SocialPostStatus.pronto,
            scheduled_at=now + timedelta(days=1, hours=4),
            responsible_id=member.id,
            responsible_name=member.name,
            workspace=WorkspaceType.enterprise,
            enterprise_id=enterprise.id,
            creator_id=admin.id,
            media_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
            media_type=SocialMediaType.image,
        ),
        SocialPost(
            title="Carrossel: 5 Dicas para Dobrar a Produtividade da Equipe",
            caption="Trabalhar com método supera trabalhar com esforço desordenado. Arraste para o lado e veja 5 hábitos comprovados por gestores de alta performance. 📊✨",
            platform=SocialPlatform.linkedin,
            status=SocialPostStatus.em_producao,
            scheduled_at=now + timedelta(days=3, hours=2),
            responsible_id=manager.id,
            responsible_name=manager.name,
            workspace=WorkspaceType.enterprise,
            enterprise_id=enterprise.id,
            creator_id=manager.id,
            media_url="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
            media_type=SocialMediaType.carousel,
        ),
        SocialPost(
            title="Vídeo Curto: Bastidores de um deploy sem sustos",
            caption="Quem nunca subiu código em produção na sexta-feira? Veja como automatizamos tudo aqui! 😂👇 #DevHumor #DevLife #Coding",
            platform=SocialPlatform.tiktok,
            status=SocialPostStatus.ideia,
            scheduled_at=now + timedelta(days=5, hours=6),
            responsible_id=None,
            responsible_name=None,  # Todos / Equipe
            workspace=WorkspaceType.enterprise,
            enterprise_id=enterprise.id,
            creator_id=member.id,
            media_url="https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80",
            media_type=SocialMediaType.video,
        ),
        SocialPost(
            title="Depoimento em Vídeo: Case Acme Corp",
            caption="Como a Acme Corp reduziu o tempo de reuniões em 40% centralizando suas demandas no TaskFlow. Assista ao relato completo!",
            platform=SocialPlatform.youtube,
            status=SocialPostStatus.revisao,
            scheduled_at=now + timedelta(days=2, hours=1),
            responsible_id=admin.id,
            responsible_name=admin.name,
            workspace=WorkspaceType.enterprise,
            enterprise_id=enterprise.id,
            creator_id=admin.id,
            media_url="https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&auto=format&fit=crop&q=80",
            media_type=SocialMediaType.video,
        ),
        SocialPost(
            title="Arte de Boas-Vindas a Novos Membros",
            caption="Boas-vindas ao nosso novo canal! Fique por dentro de todas as novidades e atualizações sobre o TaskFlow.",
            platform=SocialPlatform.facebook,
            status=SocialPostStatus.postado,
            scheduled_at=now - timedelta(days=2),
            responsible_id=member.id,
            responsible_name=member.name,
            workspace=WorkspaceType.enterprise,
            enterprise_id=enterprise.id,
            creator_id=admin.id,
            media_url="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80",
            media_type=SocialMediaType.image,
        ),
        SocialPost(
            title="Anúncio Rápido: Novas Integrações em Breve",
            caption="Estamos preparando integrações incríveis com Figma, Slack e GitHub! O que você mais quer ver no TaskFlow? Deixe nos comentários! 👇",
            platform=SocialPlatform.twitter,
            status=SocialPostStatus.pronto,
            scheduled_at=now + timedelta(hours=8),
            responsible_id=None,
            responsible_name=None,
            workspace=WorkspaceType.enterprise,
            enterprise_id=enterprise.id,
            creator_id=manager.id,
            media_url="https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80",
            media_type=SocialMediaType.image,
        ),
        # Pessoal
        SocialPost(
            title="Meu Portfólio de Design 2026",
            caption="Atualização dos meus principais projetos de UI/UX e ilustrações digitais. Dê uma olhada!",
            platform=SocialPlatform.instagram,
            status=SocialPostStatus.em_producao,
            scheduled_at=now + timedelta(days=4, hours=3),
            responsible_id=personal_user.id,
            responsible_name=personal_user.name,
            workspace=WorkspaceType.personal,
            enterprise_id=None,
            creator_id=personal_user.id,
            media_url="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80",
            media_type=SocialMediaType.image,
        ),
    ]

    for sp in social_posts:
        await social_repo.save(sp)

    print("[OK] Seed data loaded successfully")
    print("   Users: admin@taskflow.local / manager@taskflow.local / member@taskflow.local / user@taskflow.local")
    print("   Enterprise: Acme Corp")
    print(f"   Tasks: {len(personal_tasks)} personal, {len(enterprise_tasks)} enterprise")
    print(f"   Social Posts: {len(social_posts)} posts loaded")


