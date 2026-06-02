import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import OpenAI from "openai";

// We will lazily initialize the OpenAI client inside the POST handler 
// to prevent next build from crashing when environment variables are not yet loaded.

export async function POST(req: NextRequest) {
  try {
    const { user_message, session_id } = await req.json();

    if (!user_message || !session_id) {
      return NextResponse.json(
        { error: "Missing user_message or session_id in payload" },
        { status: 400 }
      );
    }

    // Initialize OpenAI client inside the request scope
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-build-time",
    });

    // 1. Generate standard JavaScript timestamps
    const dateObj = new Date();
    // Format Date: DD/MM/YYYY
    const date = dateObj.toLocaleDateString("en-GB"); 
    // time_msg_rxd: Timestamp before calling OpenAI
    const time_msg_rxd = dateObj.toLocaleTimeString("en-GB");

    // 2. Call OpenAI using the optimized JSON schema
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // You can use "gpt-4o-mini" for faster and cheaper responses
      messages: [
        {
          role: "system",
          content: `You are an intelligent AI triage agent for Crocadilo (crocadilo.com).
Your goal is to parse user messages, classify their intents, formulate an internal action plan, identify the target portal (crocadilo.com, backend.crocadilo.com, or Unknown), determine if an administrative action is required, provide an executive summary for admins, specify the type/priority of action, track your actions, and write a friendly, helpful conversational reply to the user.

Be structured, concise, and focused. Return ONLY a JSON object matching the requested schema. DO NOT wrap the response in markdown code blocks or add extra text.`
        },
        {
          role: "user",
          content: user_message
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "crocadilo_triage_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              user_intent: {
                type: "string",
                description: "The closest evaluation of what the user is trying to accomplish."
              },
              internal_plan: {
                type: "string",
                description: "The strategy path the system should target next."
              },
              target_portal: {
                type: "string",
                enum: ["crocadilo.com", "backend.crocadilo.com", "Unknown"]
              },
              is_action_required: {
                type: "string",
                enum: ["Yes", "No"]
              },
              action_required_summary: {
                type: "string",
                description: "Executive summary of what an admin needs to review."
              },
              type_of_action: {
                type: "string",
                description: "Classification category of the administrative action."
              },
              priority_of_action: {
                type: "string",
                enum: ["Low", "Medium", "High", "Critical", "None"]
              },
              what_action_was_taken: {
                type: "string",
                description: "A descriptive summary of the action the AI took."
              },
              ai_reply: {
                type: "string",
                description: "The literal conversational text reply to send back to the user."
              }
            },
            required: [
              "user_intent",
              "internal_plan",
              "target_portal",
              "is_action_required",
              "action_required_summary",
              "type_of_action",
              "priority_of_action",
              "what_action_was_taken",
              "ai_reply"
            ],
            additionalProperties: false
          }
        }
      }
    });

    // time_msg_send: Timestamp after receiving the response from OpenAI
    const time_msg_send = new Date().toLocaleTimeString("en-GB");

    // Parse the structured JSON response
    const rawContent = response.choices[0].message.content;
    if (!rawContent) {
      throw new Error("Received an empty response from OpenAI.");
    }
    
    const parsedData = JSON.parse(rawContent);
    const {
      user_intent,
      internal_plan,
      target_portal,
      is_action_required,
      action_required_summary,
      type_of_action,
      priority_of_action,
      what_action_was_taken,
      ai_reply
    } = parsedData;

    // 3. Log to Google Sheets natively in the background (asynchronous and non-blocking)
    // We run it inside a separate try-catch so slow sheet connections do not block or crash the user chat experience
    const logToSheets = async () => {
      try {
        const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY;
        const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

        if (!clientEmail || !privateKey || !spreadsheetId) {
          console.warn("[Google Sheets Logger] Skipping log append: missing environment variables.");
          return;
        }

        // Authenticate Google service account
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: clientEmail,
            private_key: privateKey.replace(/\\n/g, "\n"),
          },
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        const sheets = google.sheets({ version: "v4", auth });

        // Append a single row with all 14 columns
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: "Sheet1!A:N", // Matches exactly our 14 columns
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [
              [
                session_id,
                user_intent,
                internal_plan,
                user_message,
                ai_reply,
                date,
                time_msg_rxd,
                time_msg_send,
                target_portal,
                is_action_required,
                action_required_summary,
                type_of_action,
                priority_of_action,
                what_action_was_taken,
              ],
            ],
          },
        });
        
        console.log("[Google Sheets Logger] Chat row appended successfully.");
      } catch (sheetsError) {
        console.error("[Google Sheets Logger] Failed to append chat row:", sheetsError);
      }
    };

    // Fire-and-forget: Trigger the sheet update asynchronously without 'await'
    // so the chat screen remains blazing-fast and highly responsive
    logToSheets();

    // 4. Return the conversational reply and internal plan to the frontend
    return NextResponse.json({
      ai_reply,
      internal_plan,
    });

  } catch (error: any) {
    console.error("[Chat API Route Error]:", error);
    return NextResponse.json(
      { error: "Failed to process chat completion.", details: error.message },
      { status: 500 }
    );
  }
}
