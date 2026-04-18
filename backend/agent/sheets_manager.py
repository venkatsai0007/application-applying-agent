import re
from googleapiclient.discovery import build
from .google_auth import GoogleAuthManager

class GoogleSheetsManager:
    def __init__(self, auth_manager: GoogleAuthManager):
        self.auth_manager = auth_manager
        self.service = None

    def get_service(self):
        if not self.service:
            creds = self.auth_manager.get_credentials()
            if not creds:
                raise Exception("Not authenticated with Google")
            self.service = build('sheets', 'v4', credentials=creds)
        return self.service

    def extract_sheet_id(self, url: str):
        match = re.search(r'/d/([a-zA-Z0-9-_]+)', url)
        if match:
            return match.group(1)
        raise ValueError("Invalid Google Sheets URL")

    def initialize_sheet(self, sheet_url: str):
        """Creates the header row if it doesn't exist."""
        sheet_id = self.extract_sheet_id(sheet_url)
        service = self.get_service()
        
        # Check if header exists
        result = service.spreadsheets().values().get(
            spreadsheetId=sheet_id,
            range='Sheet1!A1:G1'
        ).execute()
        
        values = result.get('values', [])
        headers = ['Company', 'Role', 'Expected Salary', 'Location', 'Status', 'Application Link', 'Last Updated']
        
        if not values or values[0] != headers:
            body = {'values': [headers]}
            service.spreadsheets().values().update(
                spreadsheetId=sheet_id,
                range='Sheet1!A1:G1',
                valueInputOption='RAW',
                body=body
            ).execute()
            print("Initialized sheet headers.")

    def log_application(self, sheet_url: str, application_data: dict):
        """Appends a new application to the sheet."""
        sheet_id = self.extract_sheet_id(sheet_url)
        service = self.get_service()
        
        # Expected application_data keys: company, role, salary, location, status, link, date
        row_data = [
            application_data.get('company', ''),
            application_data.get('role', ''),
            application_data.get('salary', ''),
            application_data.get('location', ''),
            application_data.get('status', 'Applied'),
            application_data.get('link', ''),
            application_data.get('date', '')
        ]
        
        body = {'values': [row_data]}
        service.spreadsheets().values().append(
            spreadsheetId=sheet_id,
            range='Sheet1!A:A',
            valueInputOption='USER_ENTERED',
            insertDataOption='INSERT_ROWS',
            body=body
        ).execute()
        print(f"Logged application for {application_data.get('company')}")
