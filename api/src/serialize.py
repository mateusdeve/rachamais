"""Row -> JSON shaping.

These functions reproduce the exact payloads the Express + Prisma server sent,
because the shipped iOS app parses them as-is. The subtle part is money:
Prisma's Decimal serialized to a *string* ("150.00") on entities, while computed
balances went out as JSON numbers. Both behaviours are preserved.
"""

import json

from money import to_decimal_string


def user_public(row, *, include_email=True, include_pix=False, include_created=False):
    """The nested `user` object embedded in members/splits/activities."""
    if row is None:
        return None
    data = {
        "id": row["id"],
        "name": row["name"],
        "avatarUrl": row.get("avatarUrl"),
    }
    if include_email:
        data["email"] = row.get("email")
    if include_pix:
        data["pixKey"] = row.get("pixKey")
    if include_created:
        data["createdAt"] = row.get("createdAt")
    return data


def member(row):
    return {
        "id": row["id"],
        "groupId": row["groupId"],
        "userId": row["userId"],
        "role": row["role"],
        "joinedAt": row["joinedAt"],
        "user": {
            "id": row["userId"],
            "name": row["user_name"],
            "email": row.get("user_email"),
            "avatarUrl": row.get("user_avatarUrl"),
        },
    }


def split(row):
    return {
        "id": row["id"],
        "expenseId": row["expenseId"],
        "userId": row["userId"],
        "amount": to_decimal_string(row["amount"]),
        "percentage": (
            None if row.get("percentage") is None else f"{float(row['percentage']):.2f}"
        ),
        "user": {"id": row["userId"], "name": row["user_name"]},
    }


def expense(row, splits):
    return {
        "id": row["id"],
        "groupId": row["groupId"],
        "paidById": row["paidById"],
        "amount": to_decimal_string(row["amount"]),
        "description": row["description"],
        "category": row["category"],
        "splitType": row["splitType"],
        "date": row["date"],
        "createdAt": row["createdAt"],
        "updatedAt": row["updatedAt"],
        "paidBy": {
            "id": row["paidById"],
            "name": row["payer_name"],
            "avatarUrl": row.get("payer_avatarUrl"),
        },
        "splits": splits,
    }


def settlement(row):
    return {
        "id": row["id"],
        "groupId": row["groupId"],
        "fromUserId": row["fromUserId"],
        "toUserId": row["toUserId"],
        "amount": to_decimal_string(row["amount"]),
        "paymentMethod": row["paymentMethod"],
        "note": row.get("note"),
        "settledAt": row["settledAt"],
        "createdAt": row["createdAt"],
        "fromUser": {
            "id": row["fromUserId"],
            "name": row["from_name"],
            "avatarUrl": row.get("from_avatarUrl"),
        },
        "toUser": {
            "id": row["toUserId"],
            "name": row["to_name"],
            "avatarUrl": row.get("to_avatarUrl"),
        },
    }


def activity(row):
    return {
        "id": row["id"],
        "groupId": row["groupId"],
        "userId": row["userId"],
        "type": row["type"],
        "description": row["description"],
        "metadata": json.loads(row["metadata"]) if row.get("metadata") else None,
        "createdAt": row["createdAt"],
        "group": {
            "id": row["groupId"],
            "name": row["group_name"],
            "emoji": row["group_emoji"],
        },
        "user": {
            "id": row["userId"],
            "name": row["user_name"],
            "avatarUrl": row.get("user_avatarUrl"),
        },
    }


def group(row, members, *, expenses=None, user_balance=None, expenses_count=0):
    data = {
        "id": row["id"],
        "name": row["name"],
        "emoji": row["emoji"],
        "description": row.get("description"),
        "inviteCode": row["inviteCode"],
        "createdById": row["createdById"],
        "createdAt": row["createdAt"],
        "updatedAt": row["updatedAt"],
        "members": members,
        # The old server leaked Prisma's _count alongside membersCount; the app
        # reads membersCount, but both are kept so the payload is unchanged.
        "_count": {"members": len(members), "expenses": expenses_count},
        "membersCount": len(members),
    }
    if expenses is not None:
        data["expenses"] = expenses
    if user_balance is not None:
        data["userBalance"] = user_balance
    return data
