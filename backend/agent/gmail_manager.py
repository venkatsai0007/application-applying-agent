import base64
from googleapiclient.discovery import build
from .google_auth import GoogleAuthManager

class GmailManager:
    def __init__(self, auth_manager: GoogleAuthManager):
        self.auth_manager = auth_manager
        self.service = None

    def get_service(self):
        if not self.service:
            creds = self.auth_manager.get_credentials()
            if not creds:
                raise Exception("Not authenticated with Google")
            self.service = build('gmail', 'v1', credentials=creds)
        return self.service

    def fetch_recent_emails(self, max_results=20, query="in:inbox (interview OR reject OR application)"):
        """Fetches recent emails that might be job updates."""
        service = self.get_service()
        try:
            results = service.users().messages().list(userId='me', q=query, maxResults=max_results).execute()
            messages = results.get('messages', [])
            
            email_data = []
            for msg in messages:
                msg_detail = service.users().messages().get(userId='me', id=msg['id'], format='full').execute()
                
                # Extract headers
                headers = msg_detail['payload']['headers']
                subject = next((header['value'] for header in headers if header['name'].lower() == 'subject'), 'No Subject')
                sender = next((header['value'] for header in headers if header['name'].lower() == 'from'), 'Unknown Sender')
                date = next((header['value'] for header in headers if header['name'].lower() == 'date'), 'Unknown Date')
                
                # Extract body
                body = self._get_email_body(msg_detail['payload'])
                
                email_data.append({
                    'id': msg['id'],
                    'subject': subject,
                    'from': sender,
                    'date': date,
                    'snippet': msg_detail.get('snippet', ''),
                    'body': body
                })
            
            return email_data
        except Exception as e:
            print(f"An error occurred fetching emails: {e}")
            return []

    def _get_email_body(self, payload):
        """Recursively extracts the plain text body from the payload."""
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body'].get('data')
                    if data:
                        return base64.urlsafe_b64decode(data).decode('utf-8')
                elif 'parts' in part:
                    return self._get_email_body(part)
        elif payload['mimeType'] == 'text/plain':
            data = payload['body'].get('data')
            if data:
                return base64.urlsafe_b64decode(data).decode('utf-8')
        return ""

    def analyze_emails_for_updates(self, emails, llm_chain=None):
        """
        In the future, this will use an LLM to analyze the email body
        and extract the company name, role, and the new status (e.g., Rejected, Interview Invite).
        """
        updates = []
        # Placeholder logic:
        for email in emails:
            subject = email['subject'].lower()
            if 'reject' in subject or 'unfortunately' in subject:
                updates.append({'company': email['from'], 'status': 'Rejected', 'reason': email['snippet']})
            elif 'interview' in subject or 'next steps' in subject:
                updates.append({'company': email['from'], 'status': 'Interviewing', 'reason': email['snippet']})
                
        return updates
