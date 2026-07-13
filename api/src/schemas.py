"""Request bodies.

The messages here are the ones the app puts in front of the user, so they are
copied verbatim from the zod schemas in server.ts. Validation errors are
rendered as {"error": "<first message>"} by the handler in worker.py, matching
the old convention of surfacing only the first issue.

Email is checked with a regex rather than pydantic's EmailStr, which would drag
in the email-validator package — Python Workers can only load what Pyodide ships.
"""

import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

CATEGORIES = Literal[
    "FOOD",
    "TRANSPORT",
    "ACCOMMODATION",
    "ENTERTAINMENT",
    "SHOPPING",
    "UTILITIES",
    "HEALTH",
    "OTHER",
]
SPLIT_TYPES = Literal["EQUAL", "EXACT", "PERCENTAGE", "SHARES"]
PAYMENT_METHODS = Literal["PIX", "CASH", "TRANSFER", "CREDIT_CARD", "OTHER"]


class RegisterBody(BaseModel):
    name: str
    email: str
    password: str

    @field_validator("name")
    @classmethod
    def check_name(cls, value):
        if len(value) < 2:
            raise ValueError("Nome deve ter pelo menos 2 caracteres")
        return value

    @field_validator("email")
    @classmethod
    def check_email(cls, value):
        if not EMAIL_RE.match(value):
            raise ValueError("Email inválido")
        return value

    @field_validator("password")
    @classmethod
    def check_password(cls, value):
        if len(value) < 6:
            raise ValueError("Senha deve ter pelo menos 6 caracteres")
        return value


class LoginBody(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def check_email(cls, value):
        if not EMAIL_RE.match(value):
            raise ValueError("Email inválido")
        return value

    @field_validator("password")
    @classmethod
    def check_password(cls, value):
        if not value:
            raise ValueError("Senha é obrigatória")
        return value


class GoogleAuthBody(BaseModel):
    idToken: str

    @field_validator("idToken")
    @classmethod
    def check_token(cls, value):
        if not value:
            raise ValueError("idToken é obrigatório")
        return value


class AppleAuthBody(BaseModel):
    identityToken: str
    fullName: str | None = None

    @field_validator("identityToken")
    @classmethod
    def check_token(cls, value):
        if not value:
            raise ValueError("identityToken é obrigatório")
        return value


class CreateGroupBody(BaseModel):
    name: str
    emoji: str = "👥"
    description: str | None = None
    memberIds: list[str] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def check_name(cls, value):
        if not value:
            raise ValueError("Nome é obrigatório")
        return value


class UpdateGroupBody(BaseModel):
    name: str | None = None
    emoji: str | None = None
    description: str | None = None

    @field_validator("name")
    @classmethod
    def check_name(cls, value):
        if value is not None and not value:
            raise ValueError("Nome é obrigatório")
        return value


class JoinGroupBody(BaseModel):
    inviteCode: str

    @field_validator("inviteCode")
    @classmethod
    def check_code(cls, value):
        if not value:
            raise ValueError("Código é obrigatório")
        return value


class SplitInput(BaseModel):
    userId: str
    amount: float | None = None
    percentage: float | None = None


class CreateExpenseBody(BaseModel):
    description: str
    amount: float
    paidById: str
    category: CATEGORIES = "OTHER"
    splitType: SPLIT_TYPES = "EQUAL"
    splits: list[SplitInput]
    date: str | None = None

    @field_validator("description")
    @classmethod
    def check_description(cls, value):
        if not value:
            raise ValueError("Descrição é obrigatória")
        return value

    @field_validator("amount")
    @classmethod
    def check_amount(cls, value):
        if value <= 0:
            raise ValueError("Valor deve ser positivo")
        return value

    @field_validator("splits")
    @classmethod
    def check_splits(cls, value):
        # The old server accepted splits: [] and then divided by zero, creating
        # an expense whose cost nobody carried. Rejecting it is the fix.
        if not value:
            raise ValueError("A despesa precisa de pelo menos um participante")
        if len({s.userId for s in value}) != len(value):
            raise ValueError("Participante duplicado na divisão")
        return value


class CreateSettlementBody(BaseModel):
    fromUserId: str
    toUserId: str
    amount: float
    paymentMethod: PAYMENT_METHODS = "PIX"
    note: str | None = None

    @field_validator("amount")
    @classmethod
    def check_amount(cls, value):
        if value <= 0:
            raise ValueError("Valor deve ser positivo")
        return value


class UpdateUserBody(BaseModel):
    name: str | None = None
    pixKey: str | None = None

    @field_validator("name")
    @classmethod
    def check_name(cls, value):
        if value is None:
            return value
        if len(value) < 2:
            raise ValueError("Nome deve ter pelo menos 2 caracteres")
        if len(value) > 100:
            raise ValueError("Nome muito longo")
        return value


class DeviceTokenBody(BaseModel):
    token: str
    platform: str


class UnregisterTokenBody(BaseModel):
    token: str | None = None
