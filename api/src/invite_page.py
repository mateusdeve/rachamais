"""The public /invite/<code> landing page.

Same markup and branding as the Express version, with one deliberate fix: the
invite code is HTML-escaped before being interpolated. The old page dropped the
raw path segment straight into an href, which let anyone craft a link that
executed script in the page's origin.
"""

from html import escape

APP_STORE_URL = "https://apps.apple.com/app/id6479499344"


def render(code: str) -> str:
    safe_code = escape(code, quote=True)
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#10b748">
<title>Convite RachaMais</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #F9FAFB; color: #111813; min-height: 100vh;
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 24px;
  }}
  .logo-container {{ font-size: 64px; margin-bottom: 16px; }}
  h1 {{ font-size: 32px; font-weight: 700; }}
  .subtitle {{ color: #6B7280; margin: 8px 0 32px; }}
  .card {{
    background: #fff; border-radius: 16px; padding: 32px;
    box-shadow: 0 4px 24px rgba(0,0,0,.08); max-width: 400px; width: 100%;
    text-align: center;
  }}
  .card-title {{ font-size: 22px; margin-bottom: 8px; }}
  .card-text {{ color: #6B7280; margin-bottom: 24px; }}
  .btn {{
    display: block; width: 100%; padding: 16px; border-radius: 12px;
    font-size: 16px; font-weight: 600; text-decoration: none;
    transition: background .2s;
  }}
  .btn-primary {{ background: #10b748; color: #fff; }}
  .btn-primary:hover {{ background: #059669; }}
  .btn-secondary {{ background: #F3F4F6; color: #111813; }}
  .divider {{
    display: flex; align-items: center; color: #9CA3AF;
    font-size: 14px; margin: 16px 0;
  }}
  .divider::before, .divider::after {{
    content: ""; flex: 1; height: 1px; background: #E5E7EB;
  }}
  .divider span {{ padding: 0 12px; }}
  .footer {{ margin-top: 32px; color: #9CA3AF; font-size: 14px; }}
  @media (max-width: 480px) {{
    h1 {{ font-size: 26px; }}
    .card {{ padding: 24px; }}
  }}
</style>
</head>
<body>
  <div class="logo-container">💰</div>
  <h1>RachaMais</h1>
  <p class="subtitle">Divida contas sem complicação</p>
  <div class="card">
    <h2 class="card-title">Você foi convidado!</h2>
    <p class="card-text">Toque no botão abaixo para abrir no app e entrar no grupo.</p>
    <a class="btn btn-primary" href="rachamais://invite/{safe_code}">Abrir no app</a>
    <div class="divider"><span>ou</span></div>
    <a class="btn btn-secondary" href="{APP_STORE_URL}">Baixar na App Store</a>
  </div>
  <p class="footer">RachaMais © 2026</p>
</body>
</html>"""
