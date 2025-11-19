import { ComplianceReport, InventorySKU, GoogleUser } from '../types';

// NOTE: In a real production app, these should be in environment variables.
// You must enable Docs, Sheets, Gmail, and Drive APIs in Google Cloud Console.
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE'; 
const API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_API_KEY_HERE'; 

// Discovery docs for the APIs we want to use
const DISCOVERY_DOCS = [
  'https://docs.googleapis.com/$discovery/rest?version=v1',
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://gmail.googleapis.com/$discovery/rest?version=v1',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];

// Authorization scopes required by the API; multiple scopes can be included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/drive.file profile email';

export const googleIntegrationService = {
  
  tokenClient: null as any,
  user: null as GoogleUser | null,

  initialize: async (): Promise<void> => {
    return new Promise((resolve) => {
      const script1 = document.createElement('script');
      script1.src = 'https://accounts.google.com/gsi/client';
      script1.async = true;
      script1.defer = true;
      document.body.appendChild(script1);

      const script2 = document.createElement('script');
      script2.src = 'https://apis.google.com/js/api.js';
      script2.async = true;
      script2.defer = true;
      script2.onload = () => {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              apiKey: API_KEY,
              discoveryDocs: DISCOVERY_DOCS,
            });
            resolve();
          } catch (e) {
            console.warn("Google API Init Warning (Missing Keys?):", e);
            resolve(); // Resolve anyway to let app load
          }
        });
      };
      document.body.appendChild(script2);
    });
  },

  login: async (): Promise<GoogleUser> => {
    return new Promise((resolve, reject) => {
      if (typeof window.google === 'undefined') {
        reject("Google Identity Services not loaded");
        return;
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (response: any) => {
          if (response.error !== undefined) {
            reject(response);
            return;
          }
          
          // Fetch user profile
          try {
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` }
            });
            const userInfo = await userInfoResponse.json();
            
            const user: GoogleUser = {
              id: userInfo.sub,
              name: userInfo.name,
              email: userInfo.email,
              picture: userInfo.picture,
              accessToken: response.access_token
            };
            
            resolve(user);
          } catch (e) {
            reject(e);
          }
        },
      });

      // Request access token
      client.requestAccessToken();
    });
  },

  // --- Docs Integration ---
  createTechSheetDoc: async (projectName: string, sku: InventorySKU | null, report: ComplianceReport | null) => {
    if (!window.gapi?.client?.docs) throw new Error("Docs API not initialized. Please check API Key.");
    
    const title = `Tech Sheet: ${projectName} - ${new Date().toISOString().split('T')[0]}`;
    
    try {
      // 1. Create Document
      const createResponse = await window.gapi.client.docs.documents.create({
        title: title,
      });
      const documentId = createResponse.result.documentId;

      // 2. Insert Text
      const requests = [
        {
          insertText: {
            text: `Technical Data Sheet: ${projectName}\n\n`,
            location: { index: 1 },
          },
        },
        {
          insertText: {
            text: `SKU: ${sku?.sku || 'N/A'} (${sku?.category || 'General'})\nDimensions: ${sku?.dimensions || 'N/A'}\n\n`,
            location: { index: 1 + `Technical Data Sheet: ${projectName}\n\n`.length },
          },
        },
        {
            insertText: {
              text: `COMPLIANCE REPORT\nScore: ${report?.score || 0}/100 (${report?.status || 'Unknown'})\nRegulatory Body: ${report?.regulatoryBody || 'N/A'}\n\nMarketing Claims:\n${report?.marketingCopy?.headline || 'N/A'}\n- ${report?.marketingCopy?.claims?.join('\n- ') || ''}`,
              endOfSegmentLocation: { segmentId: "" } // Appends to end
            },
        }
      ];

      await window.gapi.client.docs.documents.batchUpdate({
        documentId: documentId,
        requests: requests,
      });

      return `https://docs.google.com/document/d/${documentId}/edit`;
    } catch (e) {
      console.error(e);
      throw new Error("Failed to create Google Doc.");
    }
  },

  // --- Sheets Integration ---
  exportComplianceToSheet: async (projectName: string, report: ComplianceReport) => {
    if (!window.gapi?.client?.sheets) throw new Error("Sheets API not initialized.");

    const title = `Compliance Report: ${projectName}`;
    
    try {
      const createResponse = await window.gapi.client.sheets.spreadsheets.create({
        properties: { title },
      });
      const spreadsheetId = createResponse.result.spreadsheetId;

      const values = [
        ["Metric", "Value", "Status"],
        ["Project", projectName, ""],
        ["Date", new Date().toLocaleDateString(), ""],
        ["Safety Score", report.score, report.status],
        ["Regulatory Body", report.regulatoryBody, ""],
        ["Detected Industry", report.detectedIndustry, ""],
        [],
        ["Checks Performed", "", ""],
        ...report.checks.map(c => [c.name, c.details, c.passed ? "PASS" : "FAIL"]),
        [],
        ["Ingredients Found", report.ingredientAnalysis.found ? "Yes" : "No", ""],
        ["Flagged Ingredients", report.ingredientAnalysis.flaggedIngredients.join(", ") || "None", ""]
      ];

      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Sheet1!A1",
        valueInputOption: "RAW",
        resource: { values },
      });

      return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    } catch (e) {
        console.error(e);
        throw new Error("Failed to export to Google Sheets.");
    }
  },

  // --- Gmail Integration ---
  createDraftEmail: async (projectName: string, recipient: string, body: string) => {
      if (!window.gapi?.client?.gmail) throw new Error("Gmail API not initialized.");

      const emailLines = [
          `To: ${recipient}`,
          `Subject: Approval Needed: ${projectName}`,
          "Content-Type: text/plain; charset=utf-8",
          "MIME-Version: 1.0",
          "",
          body
      ];

      const email = emailLines.join("\r\n").trim();
      const base64EncodedEmail = btoa(email).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      try {
          await window.gapi.client.gmail.users.drafts.create({
              userId: 'me',
              resource: {
                  message: {
                      raw: base64EncodedEmail
                  }
              }
          });
          return "Draft created in Gmail!";
      } catch (e) {
          console.error(e);
          throw new Error("Failed to create Gmail draft.");
      }
  }
};