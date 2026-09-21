from enum import Enum


class UserStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"


class ThemePreference(str, Enum):
    light = "light"
    dark = "dark"
    system = "system"


class EnterpriseRole(str, Enum):
    admin = "admin"
    manager = "manager"
    member = "member"


class MemberStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    invited = "invited"


class TaskStatus(str, Enum):
    backlog = "backlog"
    todo = "todo"
    in_progress = "in_progress"
    review = "review"
    done = "done"
    archived = "archived"


class TaskPriority(str, Enum):
    none = "none"
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class WorkspaceType(str, Enum):
    personal = "personal"
    enterprise = "enterprise"


class RecurrenceType(str, Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"


class ReminderChannel(str, Enum):
    in_app = "in_app"
    email = "email"
    push = "push"


class MessageType(str, Enum):
    text = "text"
    image = "image"
    audio = "audio"


class MessageStatus(str, Enum):
    sent = "sent"
    delivered = "delivered"
    read = "read"


class ChatType(str, Enum):
    channel = "channel"
    direct = "direct"
