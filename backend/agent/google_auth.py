import os
import json
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request

SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/spreadsheets'
]

CREDENTIALS_FILE = 'credentials.json'
TOKEN_FILE = 'token.json'

class GoogleAuthManager:
    def __init__(self, credentials_path=CREDENTIALS_FILE, token_path=TOKEN_FILE):
        self.credentials_path = credentials_path
        self.token_path = token_path
        # Use a deterministic redirect URI for manual copy-pasting if needed,
        # or urn:ietf:wg:oauth:2.0:oob which allows copy pasting the code.
        self.redirect_uri = 'urn:ietf:wg:oauth:2.0:oob'

    def is_authenticated(self):
        if os.path.exists(self.token_path):
            creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)
            if creds and creds.valid:
                return True
            if creds and creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                    with open(self.token_path, 'w') as token:
                        token.write(creds.to_json())
                    return True
                except Exception:
                    return False
        return False

    def get_credentials(self):
        if self.is_authenticated():
            return Credentials.from_authorized_user_file(self.token_path, SCOPES)
        return None

    def get_authorization_url(self):
        if not os.path.exists(self.credentials_path):
            raise FileNotFoundError("credentials.json not found. Please upload it via the UI.")
            
        flow = Flow.from_client_secrets_file(
            self.credentials_path, SCOPES, redirect_uri=self.redirect_uri)
        
        auth_url, _ = flow.authorization_url(prompt='consent')
        return auth_url

    def exchange_code(self, code: str):
        if not os.path.exists(self.credentials_path):
            raise FileNotFoundError("credentials.json not found.")
            
        flow = Flow.from_client_secrets_file(
            self.credentials_path, SCOPES, redirect_uri=self.redirect_uri)
        
        flow.fetch_token(code=code)
        creds = flow.credentials
        
        with open(self.token_path, 'w') as token:
            token.write(creds.to_json())
        return True
