import "dotenv/config";
import express from "express";


const app = express();
const port = 3000;

// Initialize fetch
let fetch: any;
try {
  fetch = globalThis.fetch;
  if (!fetch) {
    fetch = require("node-fetch");
  }
} catch (error) {
  console.error("Failed to load fetch:", error);
  process.exit(1);
}

interface BatchCallRecipient {
  phone_number: string;
}

interface BatchCallRequest {
  call_name: string;
  agent_id: string;
  agent_phone_number_id: string;
  recipients: BatchCallRecipient[];
  scheduled_time_unix?: number;
}

interface BatchCallResponse {
  id: string;
  phone_number_id: string;
  name: string;
  agent_id: string;
  created_at_unix: number;
  scheduled_time_unix: number;
  total_calls_dispatched: number;
  total_calls_scheduled: number;
  last_updated_at_unix: number;
  status: string;
  agent_name: string;
  phone_provider: string;
}

interface CallResult {
  transcript: string[];
  summary: string;
}

let callJobs: {
  numbers: string[];
  task: string;
  responses: string[];
  promise: {
    resolve: (value: CallResult) => void;
    reject: (reason?: any) => void;
  };
} | null = null;

export async function callNumbers(
  numbers: string[],
  task: string
): Promise<CallResult> {
  console.log(`Calling numbers: ${numbers.join(", ")}... ${task}`);

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY environment variable is required");
  }

  const baseUrl = "https://api.elevenlabs.io";
  const recipients: BatchCallRecipient[] = numbers.map((number) => ({
    phone_number: number,
    conversation_initiation_client_data: {
      conversation_config_override: {
        agent: {
          prompt: {
            prompt: `You are an assistant making a phone call. Your task is: ${task}`,
          },
          first_message: `Hello! I'm calling regarding ${task}`,
          language: "en",
        },
        tts: {
          voice_id: null,
        },
      },
      custom_llm_extra_body: {},
      dynamic_variables: {
        task: task,
        phone_number: number,
      },
    },
  }));

  const batchCallParams: BatchCallRequest = {
    call_name: `Task: ${task} - ${new Date().toISOString()}`,
    agent_id: "agent_01jwhcqpnwedd93j10sjh9ajqa", // Replace with your agent ID
    agent_phone_number_id: "phnum_01jwhgg7hnf9qvxk89hxcr1m3q", // Replace with your phone number ID
    recipients: recipients,
    scheduled_time_unix: Math.floor(Date.now() / 1000),
  };

  try {
    const response = await fetch(`${baseUrl}/v1/convai/batch-calling/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(batchCallParams),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorText}`
      );
    }

    const batchResponse = (await response.json()) as BatchCallResponse;
    console.log(`Batch call submitted successfully - ID: ${batchResponse.id}`);

    return new Promise<CallResult>((resolve, reject) => {
      callJobs = {
        numbers,
        task,
        responses: [],
        promise: { resolve, reject },
      };
    });
  } catch (error) {
    console.error("Error submitting batch call:", error);
    throw error;
  }
}

interface CallCallbackRequest {
  type: string;
  event_timestamp: number;
  data: {
    agent_id: string;
    conversation_id: string;
    status: string;
    transcript: Array<{
      role: string;
      message: string;
      tool_calls: null;
      tool_results: null;
      feedback: null;
      time_in_call_secs: number;
      conversation_turn_metrics: {
        convai_llm_service_ttfb?: {
          elapsed_time: number;
        };
        convai_llm_service_ttf_sentence?: {
          elapsed_time: number;
        };
      } | null;
    }>;
    metadata: {
      start_time_unix_secs: number;
      call_duration_secs: number;
      cost: number;
      deletion_settings: {
        deletion_time_unix_secs: number;
        deleted_logs_at_time_unix_secs: null;
        deleted_audio_at_time_unix_secs: null;
        deleted_transcript_at_time_unix_secs: null;
        delete_transcript_and_pii: boolean;
        delete_audio: boolean;
      };
      feedback: {
        overall_score: null;
        likes: number;
        dislikes: number;
      };
      authorization_method: string;
      charging: {
        dev_discount: boolean;
      };
      termination_reason: string;
    };
    analysis: {
      evaluation_criteria_results: Record<string, unknown>;
      data_collection_results: Record<string, unknown>;
      call_successful: string;
      transcript_summary: string;
    };
    conversation_initiation_client_data: {
      conversation_config_override: {
        agent: {
          prompt: null;
          first_message: null;
          language: string;
        };
        tts: {
          voice_id: null;
        };
      };
      custom_llm_extra_body: Record<string, unknown>;
      dynamic_variables: {
        task: string;
        phone_number: string;
      };
    };
  };
}

app.get("/call-callback", (req, res) => {
  const request = req.body as CallCallbackRequest;

  if (request.type === "post_call_transcription") {
    const phoneNumber =
      request.data.conversation_initiation_client_data.dynamic_variables
        .phone_number;
    if (callJobs?.numbers.includes(phoneNumber)) {
      console.log(
        `Found call job for ${callJobs.numbers} with task: ${callJobs.task}`
      );
      callJobs.numbers.splice(callJobs.numbers.indexOf(phoneNumber), 1);
      callJobs.responses.push(
        phoneNumber +
          ":\n" +
          request.data.transcript
            .map((t) => `${t.role}: ${t.message}`)
            .join("\n")
      );

      if (callJobs.numbers.length === 0) {
        callJobs.promise.resolve({
          transcript: request.data.transcript.map(
            (t) => `${t.role}: ${t.message}`
          ),
          summary: request.data.analysis.transcript_summary,
        });
        callJobs = null;
      }
    }
  }
});
// // 
// // app.listen(port, () => {
// //   console.log(`Example app listening on port ${port}`);
// });
